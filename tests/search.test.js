const test = require('node:test');
const assert = require('node:assert');
const formulas = require('../src/data/formulas.json');

// Replicate search logic for unit test
function searchTest(query, category) {
  let res = formulas;
  if (category && category !== 'All') {
    res = res.filter(f => f.category === category || (f.categories && f.categories.includes(category)));
  }
  if (query) {
    const q = query.trim().toLowerCase();
    const numMatch = q.match(/^(?:#|formula\s*)?(\d+)$/i);
    if (numMatch) {
      const id = parseInt(numMatch[1], 10);
      const exact = res.find(f => f.id === id);
      if (exact) return [exact];
    }
    return res.filter(f => 
      f.englishFormula.toLowerCase().includes(q) ||
      f.hindiMeaning.toLowerCase().includes(q) ||
      (f.helpingVerbs && f.helpingVerbs.some(v => v.includes(q)))
    );
  }
  return res;
}

test('Search: Exact Formula ID search', () => {
  const res207 = searchTest('207');
  assert.strictEqual(res207.length, 1);
  assert.strictEqual(res207[0].id, 207);
  assert.ok(res207[0].englishFormula.includes('have/has + been'));

  const resHash1 = searchTest('#1');
  assert.strictEqual(resHash1.length, 1);
  assert.strictEqual(resHash1[0].id, 1);
});

test('Search: Helping verb search', () => {
  const resCan = searchTest('can');
  assert.ok(resCan.length > 0);
  assert.ok(resCan.every(f => f.helpingVerbs.includes('can') || f.englishFormula.toLowerCase().includes('can')));
});

test('Search: Category filter', () => {
  const cond = searchTest('', 'Conditional Sentences');
  assert.ok(cond.length > 0);
  assert.ok(cond.every(f => f.category === 'Conditional Sentences' || f.categories.includes('Conditional Sentences')));
});

test('Search: Hindi meaning search', () => {
  const timeRes = searchTest('समय');
  assert.ok(timeRes.length > 0);
});
