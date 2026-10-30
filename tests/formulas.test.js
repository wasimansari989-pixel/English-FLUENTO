const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const formulas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/formulas.json'), 'utf8'));

test('Formulas Dataset Integrity: Exactly 600 formulas numbered 1 to 600', () => {
  assert.strictEqual(formulas.length, 600, 'There must be exactly 600 formulas');

  const ids = formulas.map(f => f.id);
  assert.strictEqual(Math.min(...ids), 1, 'Minimum formula ID must be 1');
  assert.strictEqual(Math.max(...ids), 600, 'Maximum formula ID must be 600');

  // Verify consecutive unique IDs
  const idSet = new Set();
  for (let i = 1; i <= 600; i++) {
    const f = formulas[i - 1];
    assert.strictEqual(f.id, i, `Formula at index ${i - 1} must have id ${i}`);
    assert.ok(!idSet.has(f.id), `Duplicate formula ID found: ${f.id}`);
    idSet.add(f.id);
  }
});

test('Formulas Dataset Content: All required fields present', () => {
  for (let f of formulas) {
    assert.ok(f.englishFormula && f.englishFormula.length > 0, `Formula #${f.id} missing englishFormula`);
    assert.ok(f.hindiMeaning && f.hindiMeaning.length > 0, `Formula #${f.id} missing hindiMeaning`);
    assert.ok(f.category && f.category.length > 0, `Formula #${f.id} missing category`);
    assert.ok(Array.isArray(f.examples), `Formula #${f.id} examples must be an array`);
    assert.ok(f.examples.length >= 3, `Formula #${f.id} has fewer than 3 examples`);
  }
});

test('Examples Integrity: Exact sentence text reconstruction from segments', () => {
  let totalEx = 0;
  for (let f of formulas) {
    for (let ex of f.examples) {
      totalEx++;
      assert.ok(ex.originalHindi, `Formula #${f.id} example missing originalHindi`);
      assert.ok(ex.originalEnglish, `Formula #${f.id} example missing originalEnglish`);

      // Verify Hindi segment concatenation
      const reconstructedHindi = ex.hindiSegments.map(s => s.text).join('');
      assert.strictEqual(
        reconstructedHindi,
        ex.originalHindi,
        `Formula #${f.id} Hindi segment reconstruction mismatch!`
      );

      // Verify English segment concatenation
      const reconstructedEnglish = ex.englishSegments.map(s => s.text).join('');
      assert.strictEqual(
        reconstructedEnglish,
        ex.originalEnglish,
        `Formula #${f.id} English segment reconstruction mismatch!`
      );
    }
  }
  assert.strictEqual(totalEx, 3000, 'Expected exactly 3000 total examples');
});
