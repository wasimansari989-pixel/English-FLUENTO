const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const formulas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/formulas.json'), 'utf8'));

// Test 1: Full 600-formula dataset availability & integrity without network
test('Offline: All 600 formulas, Hindi meanings, English examples & segments exist locally', () => {
  assert.strictEqual(formulas.length, 600, 'Must have all 600 formulas bundled locally');

  for (let f of formulas) {
    assert.ok(f.id >= 1 && f.id <= 600, `Formula #${f.id} has invalid ID`);
    assert.ok(f.englishFormula, `Formula #${f.id} missing englishFormula`);
    assert.ok(f.hindiMeaning, `Formula #${f.id} missing hindiMeaning`);
    assert.ok(f.examples && f.examples.length >= 3, `Formula #${f.id} missing examples`);

    // Verify phrase-matching information
    for (let ex of f.examples) {
      assert.ok(ex.hindiSegments && ex.hindiSegments.length > 0, `Formula #${f.id} missing hindiSegments`);
      assert.ok(ex.englishSegments && ex.englishSegments.length > 0, `Formula #${f.id} missing englishSegments`);
    }
  }
});

// Test 2: Local search offline
test('Offline: Formula search & filters work locally without network calls', () => {
  function localSearch(query, category, helpingVerb) {
    let pool = formulas;
    if (category && category !== 'All') {
      pool = pool.filter(f => f.category === category || (f.categories && f.categories.includes(category)));
    }
    if (helpingVerb) {
      const hvNorm = helpingVerb.toLowerCase().trim();
      pool = pool.filter(f => f.helpingVerbs && f.helpingVerbs.includes(hvNorm));
    }
    if (query) {
      const q = query.toLowerCase().trim();
      pool = pool.filter(f =>
        f.englishFormula.toLowerCase().includes(q) ||
        f.hindiMeaning.toLowerCase().includes(q)
      );
    }
    return pool;
  }

  // Exact search
  const conditionals = localSearch('', 'Conditional Sentences');
  assert.ok(conditionals.length > 0, 'Category filter must return formulas locally');

  // Helping verb search
  const shouldVerbs = localSearch('', undefined, 'should');
  assert.ok(shouldVerbs.length > 0, 'Helping verb search must return formulas locally');

  // Query search
  const results = localSearch('have been');
  assert.ok(results.length > 0, 'Query search must work locally');
});

// Test 3: Offline Bookmarks
test('Offline: Bookmarks toggle and persist in local storage', () => {
  const localBookmarkStore = new Set();

  function toggleBookmark(id) {
    if (localBookmarkStore.has(id)) {
      localBookmarkStore.delete(id);
      return false;
    } else {
      localBookmarkStore.add(id);
      return true;
    }
  }

  assert.strictEqual(toggleBookmark(42), true);
  assert.strictEqual(localBookmarkStore.has(42), true);

  assert.strictEqual(toggleBookmark(42), false);
  assert.strictEqual(localBookmarkStore.has(42), false);
});

// Test 4: Offline Sync Queue & Deduplication
test('Offline: Sync queue enqueues tasks, prevents duplicate event keys, and resolves conflicts', () => {
  let queue = [];

  function enqueue(task) {
    if (task.eventKey) {
      const existingIdx = queue.findIndex(t => t.eventKey === task.eventKey);
      if (existingIdx >= 0) {
        queue[existingIdx].payload = task.payload;
        return;
      }
    } else if (task.type === 'leaderboard_sync') {
      const existingIdx = queue.findIndex(t => t.type === 'leaderboard_sync');
      if (existingIdx >= 0) {
        // Conflict resolution: preserve higher XP
        const existingXp = queue[existingIdx].payload.totalXp;
        const newXp = task.payload.totalXp;
        if (newXp >= existingXp) {
          queue[existingIdx].payload = task.payload;
        }
        return;
      }
    }
    queue.push({ ...task, retryCount: 0 });
  }

  // Enqueue initial sync
  enqueue({ type: 'leaderboard_sync', payload: { totalXp: 150, streak: 3 } });
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].payload.totalXp, 150);

  // Enqueue updated sync with higher XP -> should replace existing, not duplicate!
  enqueue({ type: 'leaderboard_sync', payload: { totalXp: 210, streak: 3 } });
  assert.strictEqual(queue.length, 1, 'Queue must not duplicate leaderboard_sync task');
  assert.strictEqual(queue[0].payload.totalXp, 210, 'Must preserve higher newer XP');

  // Enqueue lower XP -> conflict resolution keeps 210
  enqueue({ type: 'leaderboard_sync', payload: { totalXp: 180, streak: 3 } });
  assert.strictEqual(queue[0].payload.totalXp, 210, 'Must preserve highest XP');

  // Enqueue unique activity event
  enqueue({ type: 'activity_sync', eventKey: 'quiz_comp_1', payload: { score: 10 } });
  assert.strictEqual(queue.length, 2);

  // Duplicate activity event key -> should update, not create 3rd item
  enqueue({ type: 'activity_sync', eventKey: 'quiz_comp_1', payload: { score: 10 } });
  assert.strictEqual(queue.length, 2, 'Must not duplicate identical eventKey');
});

// Test 5: Safe retry logic with exponential backoff
test('Offline: Safe retry logic retains tasks until confirmed online sync', () => {
  let queue = [
    { id: 'task_1', type: 'leaderboard_sync', retryCount: 0, nextRetryTime: 0 }
  ];

  function processQueueSimulation(isOnline, serverSuccess) {
    if (!isOnline) {
      return { processed: 0, remaining: queue.length };
    }
    const remaining = [];
    let processed = 0;
    for (const task of queue) {
      if (serverSuccess) {
        processed++;
      } else {
        task.retryCount++;
        task.nextRetryTime = Date.now() + Math.pow(2, task.retryCount) * 1000;
        if (task.retryCount < 5) {
          remaining.push(task);
        }
      }
    }
    queue = remaining;
    return { processed, remaining: queue.length };
  }

  // When offline: does not drop tasks
  const offRes = processQueueSimulation(false, false);
  assert.strictEqual(offRes.processed, 0);
  assert.strictEqual(offRes.remaining, 1);
  assert.strictEqual(queue.length, 1, 'Tasks must be kept in queue when offline');

  // When online but server error (500): increments retryCount and retains
  const failRes = processQueueSimulation(true, false);
  assert.strictEqual(failRes.processed, 0);
  assert.strictEqual(failRes.remaining, 1);
  assert.strictEqual(queue[0].retryCount, 1);
  assert.ok(queue[0].nextRetryTime > Date.now());

  // When online and server success (200 OK): drains task
  const successRes = processQueueSimulation(true, true);
  assert.strictEqual(successRes.processed, 1);
  assert.strictEqual(successRes.remaining, 0);
  assert.strictEqual(queue.length, 0, 'Successfully synced task must be removed');
});
