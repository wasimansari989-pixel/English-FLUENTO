const fs = require('fs');
const pdf = require('pdf-parse');

// Helper to clean up PDF subscript artifacts: e.g. "V 1", "V + 1", "V +ing"
function cleanFormulaString(str) {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .replace(/V\s*\+\s*1/gi, 'V1')
    .replace(/V\s+1\b/gi, 'V1')
    .replace(/V\s*\+\s*2/gi, 'V2')
    .replace(/V\s+2\b/gi, 'V2')
    .replace(/V\s*\+\s*3/gi, 'V3')
    .replace(/V\s+3\b/gi, 'V3')
    .replace(/V\s*\+\s*ing/gi, 'V+ing')
    .replace(/V\s+ing/gi, 'V+ing')
    .replace(/sub\s*2/gi, 'sub2')
    .replace(/sub\s*1/gi, 'sub1')
    .replace(/noun\s*1/gi, 'noun1')
    .replace(/noun\s*2/gi, 'noun2')
    .trim();
}

function cleanHindiString(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

// Extract helping verbs from structure or examples
function detectHelpingVerbs(formulaStr, examples) {
  const text = (formulaStr + ' ' + examples.map(e => e.english).join(' ')).toLowerCase();
  const verbs = [];

  const candidates = [
    'would have been', 'will have been', 'must have been', 'could have been', 'should have been',
    'have been', 'has been', 'had been', 'will have', 'would have', 'could have', 'should have', 'must have', 'may have', 'might have',
    'have to', 'has to', 'had to', 'will have to', 'having to',
    'is to', 'am to', 'are to', 'was to', 'were to',
    'used to', 'had better', 'would rather', 'ought to',
    'can', 'could', 'may', 'might', 'shall', 'should', 'will', 'would', 'must',
    'have', 'has', 'had',
    'am', 'is', 'are', 'was', 'were',
    'do', 'does', 'did'
  ];

  for (let cand of candidates) {
    const regex = new RegExp(`\\b${cand.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(text)) {
      if (!verbs.some(v => v.includes(cand))) {
        verbs.push(cand);
      }
    }
  }

  // Deduplicate: if "have been" is present, don't keep duplicate sub-elements if redundant,
  // but for searchability, keeping base helping verbs is great too.
  return Array.from(new Set(verbs));
}

// Assign grammar categories
function assignCategories(formula) {
  const f = formula.englishFormula.toLowerCase();
  const h = formula.hindiMeaning.toLowerCase();
  const tags = new Set();
  const cats = new Set();

  if (/\b(have|has|had)\b/.test(f)) {
    tags.add('have/has/had');
    cats.add('Have / Has / Had');
  }
  if (/\b(am|is|are)\b/.test(f)) {
    tags.add('am/is/are');
    cats.add('Am / Is / Are');
  }
  if (/\b(was|were)\b/.test(f)) {
    tags.add('was/were');
    cats.add('Was / Were');
  }
  if (/\b(do|does|did)\b/.test(f)) {
    tags.add('do/does/did');
    cats.add('Do / Does / Did');
  }
  if (/\b(will|would)\b/.test(f)) {
    tags.add('will/would');
    cats.add('Will / Would');
  }
  if (/\b(can|could)\b/.test(f)) {
    tags.add('can/could');
    cats.add('Can / Could');
  }
  if (/\b(may|might)\b/.test(f)) {
    tags.add('may/might');
    cats.add('May / Might');
  }
  if (/\b(should|must)\b/.test(f)) {
    tags.add('should/must');
    cats.add('Should / Must');
  }
  if (/been/.test(f)) {
    tags.add('perfect-continuous');
    cats.add('Have been / Has been / Had been');
  }
  if (/v3\b/.test(f)) {
    tags.add('perfect-tense');
    tags.add('V3');
  }
  if (/v\+ing\b/.test(f) || /v_ing\b/.test(f)) {
    tags.add('continuous');
    tags.add('V-ing');
  }
  if (/v1\b/.test(f)) {
    tags.add('V1');
  }
  if (/v2\b/.test(f)) {
    tags.add('V2');
  }
  if (/\?/.test(f) || /\?/.test(h) || /\b(what|why|who|how|where|when|which)\b/i.test(f)) {
    tags.add('question');
    cats.add('Questions and Interrogative');
  }
  if (/\b(not|don't|doesn't|didn't|never|cannot|no)\b/i.test(f) || /नहीं|मत/i.test(h)) {
    tags.add('negative');
    cats.add('Negative Sentences');
  }
  if (/^\s*if\b|\bif\b|\bwere you\b|\bhad i known\b/i.test(f) || /अगर|यदि|काश/i.test(h)) {
    tags.add('conditional');
    cats.add('Conditional Sentences');
  }
  if (/feel like|habit of|used to|fond of|bored with|fond|worth|matter|time to|busy/i.test(f)) {
    tags.add('spoken-english');
    cats.add('Daily Spoken English');
  }
  if (/wish/i.test(f) || /काश/i.test(h)) {
    tags.add('wishes-desires');
    cats.add('Wishes and Regrets');
  }
  if (cats.size === 0) {
    cats.add('Common Expressions');
  }

  return {
    categories: Array.from(cats),
    grammarTags: Array.from(tags)
  };
}

module.exports = {
  cleanFormulaString,
  cleanHindiString,
  detectHelpingVerbs,
  assignCategories
};
