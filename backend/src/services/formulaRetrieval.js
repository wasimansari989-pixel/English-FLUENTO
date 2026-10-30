const path = require('path');
const fs = require('fs');

let dataset = [];
try {
  const dataPath = path.resolve(__dirname, '../../../src/data/formulas.json');
  if (fs.existsSync(dataPath)) {
    dataset = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } else {
    const fallbackPath = path.resolve(__dirname, '../../../all_formulas_extracted.json');
    if (fs.existsSync(fallbackPath)) {
      dataset = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    }
  }
} catch (err) {
  console.warn('Could not load formulas dataset for backend retrieval:', err.message);
}

const FormulaRetrieval = {
  getFormulaById(id) {
    return dataset.find(f => f.id === parseInt(id, 10));
  },

  retrieveContext(options = {}) {
    const { formulaId, query } = options;
    const retrieved = [];

    // 1. If explicit formulaId is provided, get it first
    if (formulaId) {
      const target = this.getFormulaById(formulaId);
      if (target) {
        retrieved.push({
          id: target.id,
          englishFormula: target.englishFormula,
          hindiMeaning: target.hindiMeaning,
          helpingVerbs: target.helpingVerbs,
          examples: target.examples.slice(0, 3).map(e => ({
            hindi: e.originalHindi,
            english: e.originalEnglish
          }))
        });
      }
    }

    // 2. If query is provided, search top matching formulas
    if (query && retrieved.length < 3) {
      const q = query.toLowerCase().trim();
      const candidates = dataset.filter(f => {
        if (formulaId && f.id === parseInt(formulaId, 10)) return false;
        const inFormula = f.englishFormula.toLowerCase().includes(q);
        const inHindi = f.hindiMeaning.toLowerCase().includes(q);
        const inVerbs = f.helpingVerbs && f.helpingVerbs.some(v => v.includes(q));
        const inTags = f.grammarTags && f.grammarTags.some(t => t.includes(q));
        return inFormula || inHindi || inVerbs || inTags;
      });

      for (let cand of candidates.slice(0, 3 - retrieved.length)) {
        retrieved.push({
          id: cand.id,
          englishFormula: cand.englishFormula,
          hindiMeaning: cand.hindiMeaning,
          helpingVerbs: cand.helpingVerbs,
          examples: cand.examples.slice(0, 2).map(e => ({
            hindi: e.originalHindi,
            english: e.originalEnglish
          }))
        });
      }
    }

    return retrieved;
  }
};

module.exports = FormulaRetrieval;
