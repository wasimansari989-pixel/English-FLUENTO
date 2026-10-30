const fs = require('fs');
const path = require('path');
const { correctHindiText } = require('./src/utils/hindiCorrector');
const { segmentSentence } = require('./segmenter');

const formulasPath = path.resolve(__dirname, 'src/data/formulas.json');
const dataset = JSON.parse(fs.readFileSync(formulasPath, 'utf8'));

console.log(`Processing ${dataset.length} formulas for comprehensive Hindi spelling & double matra corrections...`);

const FORMULA_MEANING_OVERRIDES = {
  246: "थोड़ी ____ बची है",
  304: "क्या _____ कभी",
  306: "ऐसे तो",
  316: "गलती से",
  317: "पक्का है",
  318: "बात ही कुछ और है",
  320: "लगता है",
  325: "मान लो",
  330: "एक बात बोलूँ?",
  382: "समझ के बाहर है",
  383: "अचानक से",
  384: "पास ____ हुआ करता था",
  385: "इसी बीच, इसी दौरान",
  386: "पता चला कि",
  391: "करेगा ही करेगा",
  392: "चाहिए था",
  393: "मुझे बताइए",
  394: "तुम क्यों नहीं",
  406: "लंबा चलेगा",
  407: "ये लो",
  409: "तुम्हारे चक्कर में"
};

let correctedCount = 0;
let examplesCorrected = 0;

for (let formula of dataset) {
  // Fix English formula trailing OCR artifact for F325
  if (formula.id === 325 && formula.englishFormula.includes('object?')) {
    formula.englishFormula = "Suppose + sentence.";
  }

  // Apply override or text correction to hindiMeaning
  const originalMeaning = formula.hindiMeaning;
  let fixedMeaning = FORMULA_MEANING_OVERRIDES[formula.id] || correctHindiText(originalMeaning);
  // Clean any remaining outer brackets or trailing numbers in hindiMeaning
  fixedMeaning = fixedMeaning.replace(/^[(]+|[)]+$/g, '').trim();

  if (originalMeaning !== fixedMeaning) {
    formula.hindiMeaning = fixedMeaning;
    correctedCount++;
  }

  // Derive highlight search phrases from the fixed Hindi meaning
  const cleanMeaning = fixedMeaning.replace(/[()._–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const searchPhrases = new Set();
  searchPhrases.add(cleanMeaning);

  // If contains blanks like "पास ____ है", split to words
  if (cleanMeaning.includes('____') || cleanMeaning.includes('___')) {
    cleanMeaning.split(/_+/).forEach(p => {
      const trimmed = p.trim();
      if (trimmed) searchPhrases.add(trimmed);
    });
  } else {
    // If multiple phrases separated by comma or slash
    cleanMeaning.split(/[,/]/).forEach(p => {
      const trimmed = p.trim();
      if (trimmed) searchPhrases.add(trimmed);
    });
  }

  // Also include variations like सकता/सकती/सकते or रहा/रही/रहे
  const phraseArr = Array.from(searchPhrases);
  for (let sp of phraseArr) {
    if (/सकता|सकती|सकते/.test(sp)) {
      const base = sp.replace(/(सकता|सकती|सकते)\s*(है|था|हो|हूँ)?/g, '').trim();
      ['सकता', 'सकती', 'सकते', 'सका', 'सकी', 'सके'].forEach(w => searchPhrases.add((base + ' ' + w).trim()));
    }
    if (/रहा|रही|रहे/.test(sp)) {
      const base = sp.replace(/(रहा|रही|रहे)\s*(है|था|थी|थे|हो|हूँ|होंगे|होंगी)?/g, '').trim();
      ['रहा', 'रही', 'रहे'].forEach(w => searchPhrases.add((base + ' ' + w).trim()));
    }
    if (/पड़ता|पड़ती|पड़ते|पड़ा/.test(sp)) {
      const base = sp.replace(/(पड़ता|पड़ती|पड़ते|पड़ा|पड़ी|पड़े|पड़ेगा|पड़ेगी)\s*(है|था|हो)?/g, '').trim();
      ['पड़ता', 'पड़ती', 'पड़ते', 'पड़ा', 'पड़ी', 'पड़े', 'पड़ेगा', 'पड़ेगी'].forEach(w => searchPhrases.add((base + ' ' + w).trim()));
    }
    if (/हुआ|हुई|हुए/.test(sp)) {
      const base = sp.replace(/(हुआ|हुई|हुए)\s*(करता था|करता थी|करते थे|था|थी|थे)?/g, '').trim();
      ['हुआ', 'हुई', 'हुए', 'हुआ करता था', 'हुई करती थी', 'हुए करते थे'].forEach(w => searchPhrases.add((base + ' ' + w).trim()));
    }
    if (/लगा|लगी|लगे/.test(sp)) {
      const base = sp.replace(/(लगा|लगी|लगे)\s*(है|था|थी|थे)?/g, '').trim();
      ['लगा', 'लगी', 'लगे', 'लगता है', 'लगती है', 'लगते है'].forEach(w => searchPhrases.add((base + ' ' + w).trim()));
    }
  }

  const hinKeys = Array.from(searchPhrases).filter(k => k.length > 0);

  // Fix all examples
  for (let ex of formula.examples) {
    const rawHindi = ex.originalHindi;
    const fixedHindi = correctHindiText(rawHindi);
    if (rawHindi !== fixedHindi) {
      ex.originalHindi = fixedHindi;
      examplesCorrected++;
    }

    // Re-segment with fixed Hindi text
    ex.hindiSegments = segmentSentence(ex.originalHindi, hinKeys, 'g1');
  }
}

console.log(`Updated formulas hindiMeaning: ${correctedCount}`);
console.log(`Updated example sentences: ${examplesCorrected}`);

// Write back to files
fs.writeFileSync(formulasPath, JSON.stringify(dataset, null, 2));
fs.writeFileSync('all_formulas_extracted.json', JSON.stringify(dataset, null, 2));

console.log('Successfully written corrected formulas to src/data/formulas.json and all_formulas_extracted.json!');
