const fs = require('fs');
const pdf = require('pdf-parse');
const { cleanFormulaString, cleanHindiString, detectHelpingVerbs, assignCategories } = require('./parser_helpers');
const { segmentSentence } = require('./segmenter');

// Normalizer to extract highlighting keys from english formula and hindi meaning
function deriveHighlightKeys(formulaStr, hindiMeaning) {
  let engKeys = [];
  let hinKeys = [];

  // Clean hindi meaning by removing parentheses and underscores
  let cleanHin = hindiMeaning.replace(/[()]/g, '').trim();
  // Split on comma / slash if multiple
  const hinParts = cleanHin.split(/[,/]/).map(s => s.trim().replace(/_{2,}/g, '').trim()).filter(s => s.length > 0);
  
  // If cleanHin has blanks like "पास ____है", we want to match "पास" and "है"
  if (cleanHin.includes('____') || cleanHin.includes('___')) {
    const parts = cleanHin.split(/_{2,}/).map(s => s.trim()).filter(s => s.length > 0);
    hinKeys.push(...parts);
  } else {
    hinKeys.push(...hinParts);
  }

  // Derive English keys from formula string:
  // Usually the key is before "+ V1" or after "Sub +" etc.
  let fClean = formulaStr.replace(/^Sub\s*\+\s*/i, '').trim();
  
  // Check common patterns:
  // e.g. "have/has + things" -> "have", "has"
  // "am/is/are + V+ing" -> "am", "is", "are"
  // "Show me to + V1" -> "Show me to"
  // "There is a limit to + V+ing" -> "There is a limit to"
  // "Don't + V1 + here and there" -> "here and there"
  if (/^have\/has\b/i.test(fClean)) {
    engKeys.push('have', 'has');
  } else if (/^am\/is\/are\b/i.test(fClean)) {
    engKeys.push('am', 'is', 'are');
  } else if (/^was\/were\b/i.test(fClean)) {
    engKeys.push('was', 'were');
  } else if (/^do\/does\b/i.test(fClean)) {
    engKeys.push('do', 'does');
  } else if (/^did\b/i.test(fClean)) {
    engKeys.push('did');
  } else if (/^will\b/i.test(fClean) && !/will have/i.test(fClean) && !/will be/i.test(fClean)) {
    engKeys.push('will');
  } else if (/^will have\b/i.test(fClean)) {
    engKeys.push('will have');
  } else if (/^would have\b/i.test(fClean)) {
    engKeys.push('would have');
  } else if (/^will be\b/i.test(fClean)) {
    engKeys.push('will be');
  } else if (/^can\b/i.test(fClean)) {
    engKeys.push('can');
  } else if (/^could\b/i.test(fClean)) {
    engKeys.push('could');
  } else if (/^should\b/i.test(fClean)) {
    engKeys.push('should');
  } else if (/^must\b/i.test(fClean)) {
    engKeys.push('must');
  } else if (/^may\b/i.test(fClean)) {
    engKeys.push('may');
  } else {
    // Take the phrase before "+" or up to object/sentence
    const parts = fClean.split('+').map(p => p.trim());
    if (parts.length > 0) {
      for (let p of parts) {
        if (/^(V1|V2|V3|V\+ing|obj|object|sub|noun|things|place|person|sentence|duration)$/i.test(p)) continue;
        if (p.length > 1) {
          engKeys.push(p);
        }
      }
    }
  }

  return { engKeys, hinKeys };
}

async function buildCompleteDataset() {
  console.log('Reading PDF file...');
  const dataBuffer = fs.readFileSync('600 English Sentence Formula pdf.pdf');
  const pages = [];
  let curPage = 0;
  
  await pdf(dataBuffer, {
    pagerender: function(pageData) {
      curPage++;
      const p = curPage;
      return pageData.getTextContent().then(function(tc) {
        const items = tc.items.map(it => ({
          str: it.str.trim(),
          x: Math.round(it.transform[4]),
          y: Math.round(it.transform[5]),
          width: Math.round(it.width),
          height: Math.round(it.height)
        })).filter(it => it.str.length > 0);

        items.sort((a, b) => b.y - a.y || a.x - b.x);

        let lines = [];
        let curY = null;
        let curLineItems = [];
        for (let it of items) {
          if (curY === null || Math.abs(it.y - curY) > 5) {
            if (curLineItems.length > 0) {
              lines.push({ y: curY, text: curLineItems.map(i => i.str).join(' ') });
            }
            curY = it.y;
            curLineItems = [it];
          } else {
            curLineItems.push(it);
          }
        }
        if (curLineItems.length > 0) {
          lines.push({ y: curY, text: curLineItems.map(i => i.str).join(' ') });
        }

        pages.push({ pageNum: p, lines });
        return '';
      });
    }
  });

  console.log(`Extracting formulas from ${pages.length} pages...`);

  const ghostWatermarks = [
    'to + V1 + object.',
    'Sub + kept + V+ing + object.',
    '+ object?',
    'ple + sentence.',
    'What kind of way is this to + V1 + object?',
    'What kind of way is this to + V',
    '1 + object?',
    'to + V1 +',
    '+ sentence.'
  ];

  const allFormulas = [];

  for (let i = 2; i < pages.length; i++) {
    const page = pages[i];
    const lines = page.lines;

    // 1. Identify formula ID (Page 3 is Formula 1, Page 602 is Formula 600)
    const formulaId = page.pageNum - 2;
    let headerIdx = -1;
    for (let l = 0; l < lines.length; l++) {
      if (/English\s+Sentence\s+Formula/i.test(lines[l].text)) {
        headerIdx = l;
        break;
      }
    }

    // 2. Identify Page number in footer
    let docPageNum = page.pageNum - 1;
    const pageNumLine = lines.find(l => l.text.includes('| Page'));
    if (pageNumLine) {
      const pm = pageNumLine.text.match(/(\d+)\s*\|\s*Page/i);
      if (pm) docPageNum = parseInt(pm[1], 10);
    }

    // 3. Find Example section
    let exampleIdx = lines.findIndex(l => /Example\s*:/i.test(l.text) || /^Example$/i.test(l.text));
    if (exampleIdx === -1) {
      exampleIdx = lines.findIndex(l => l.text.includes('Example'));
    }

    // 4. Extract English Formula and Hindi Meaning from preLines
    const preLines = lines.slice(headerIdx + 1, exampleIdx).filter(l => {
      const t = l.text.trim();
      return t && t !== '.' && !ghostWatermarks.includes(t);
    });

    let rawFormulaStr = '';
    let rawHindiMeaning = '';

    for (let pl of preLines) {
      const txt = pl.text.trim();
      if (txt.startsWith('(') || /[\u0900-\u097F]/.test(txt)) {
        if (!rawHindiMeaning) rawHindiMeaning = txt;
        else rawHindiMeaning += ' ' + txt;
      } else {
        if (!rawFormulaStr) rawFormulaStr = txt;
        else rawFormulaStr += ' ' + txt;
      }
    }

    // If formula structure was at the bottom on some page (rare), check bottom lines
    if (!rawFormulaStr) {
      const bottomLines = lines.filter(l => l.y < 90 && /[a-zA-Z]/.test(l.text) && !l.text.includes('| Page'));
      if (bottomLines.length > 0) {
        rawFormulaStr = bottomLines.map(l => l.text).join(' ');
      }
    }

    const cleanedFormula = cleanFormulaString(rawFormulaStr);
    const cleanedHindiMeaning = cleanHindiString(rawHindiMeaning).replace(/^\(|\)$/g, '').trim();

    // 5. Extract Examples
    const postExampleLines = lines.slice(exampleIdx + 1).filter(l => {
      const t = l.text.trim();
      if (!t || t === '.' || t.includes('| Page') || t.includes('English Sentence Formula')) return false;
      return true;
    });

    const rawExamples = [];
    let curHindi = '';
    let curEnglish = '';

    const hasDev = s => /[\u0900-\u097F]/.test(s);
    const hasLat = s => /[a-zA-Z]/.test(s);

    for (let l of postExampleLines) {
      let txt = l.text.trim();
      // Check if line is watermark
      if (ghostWatermarks.some(w => txt.includes(w) && l.y < 350)) {
        // Strip out the watermark substring if it's merged into example text
        for (let w of ghostWatermarks) {
          txt = txt.replace(w, '').trim();
        }
        if (!txt) continue;
      }

      const isBullet = txt.startsWith('•') || txt.startsWith('*') || txt.startsWith('-');
      txt = txt.replace(/^[•*-]\s*/, '').trim();
      if (!txt || txt === '.') continue;

      if (isBullet) {
        // New example starts!
        if (curHindi && curEnglish) {
          rawExamples.push({ hindi: curHindi.trim(), english: curEnglish.trim() });
          curHindi = '';
          curEnglish = '';
        }
        if (hasDev(txt)) {
          curHindi = txt;
        } else {
          curEnglish = txt;
        }
      } else {
        // Not marked with bullet
        if (hasDev(txt) && !hasLat(txt)) {
          // Pure Hindi
          if (curHindi && curEnglish) {
            rawExamples.push({ hindi: curHindi.trim(), english: curEnglish.trim() });
            curHindi = txt;
            curEnglish = '';
          } else if (curHindi && !curEnglish) {
            curHindi += ' ' + txt;
          } else {
            curHindi = txt;
          }
        } else if (hasLat(txt) && !hasDev(txt)) {
          // Pure English
          if (curHindi && !curEnglish) {
            curEnglish = txt;
          } else if (curHindi && curEnglish) {
            curEnglish += ' ' + txt;
          }
        } else if (hasDev(txt) && hasLat(txt)) {
          // Mixed
          const devIdx = txt.search(/[\u0900-\u097F]/);
          const latIdx = txt.search(/[a-zA-Z]/);
          if (devIdx < latIdx) {
            if (curHindi && curEnglish) {
              rawExamples.push({ hindi: curHindi.trim(), english: curEnglish.trim() });
              curHindi = txt;
              curEnglish = '';
            } else if (curHindi && !curEnglish) {
              curHindi += ' ' + txt;
            } else {
              curHindi = txt;
            }
          } else {
            if (curHindi && !curEnglish) {
              curEnglish = txt;
            } else if (curHindi && curEnglish) {
              curEnglish += ' ' + txt;
            }
          }
        }
      }
    }
    if (curHindi && curEnglish) {
      rawExamples.push({ hindi: curHindi.trim(), english: curEnglish.trim() });
    }

    // 6. Highlight derivation & Segmentation
    const { engKeys, hinKeys } = deriveHighlightKeys(cleanedFormula, cleanedHindiMeaning);

    const parsedExamples = rawExamples.map((ex, exIdx) => {
      // Clean up OCR character mappings in Hindi for highlighting matching:
      // In PDF OCR: "िे" -> "दे", "िो" -> "दो", "दक" -> "कि", "हाँ" -> "हूँ", "ग्लख" -> "खि"
      // We will match both exact and relaxed patterns
      const hinPatterns = [...hinKeys];
      // Add common Hindi variations based on formula meaning
      for (let hk of hinKeys) {
        if (hk.includes('आदत')) hinPatterns.push(hk.replace(/आदत/g, 'आित'));
        if (hk.includes('आित')) hinPatterns.push(hk.replace(/आित/g, 'आदत'));
        if (hk.includes('हद')) hinPatterns.push(hk.replace(/हद/g, 'हि'));
        if (hk.includes('हि')) hinPatterns.push(hk.replace(/हि/g, 'हद'));
        if (hk.includes('इधर')) hinPatterns.push(hk.replace(/इधर/g, 'ईधर'));
        if (hk.includes('ईधर')) hinPatterns.push(hk.replace(/ईधर/g, 'इधर'));
        if (hk.includes('हूँ')) hinPatterns.push(hk.replace(/हूँ/g, 'हाँ'));
        if (hk.includes('हाँ')) hinPatterns.push(hk.replace(/हाँ/g, 'हूँ'));
        if (hk.includes('हैं')) hinPatterns.push(hk.replace(/हैं/g, 'है'));
        if (hk.includes('होंगे')) hinPatterns.push(hk.replace(/होंगे/g, 'होोंगे'));
      }

      const hindiSegments = segmentSentence(ex.hindi, hinPatterns, 'g1');
      const englishSegments = segmentSentence(ex.english, engKeys, 'g1');

      return {
        id: `${formulaId}-${exIdx + 1}`,
        hindiSegments,
        englishSegments,
        originalHindi: ex.hindi,
        originalEnglish: ex.english,
        reviewStatus: 'reviewed'
      };
    });

    const helpingVerbs = detectHelpingVerbs(cleanedFormula, rawExamples);
    const { categories, grammarTags } = assignCategories({
      englishFormula: cleanedFormula,
      hindiMeaning: cleanedHindiMeaning
    });

    allFormulas.push({
      id: formulaId,
      title: `Formula ${formulaId}`,
      englishFormula: cleanedFormula,
      hindiMeaning: cleanedHindiMeaning,
      examples: parsedExamples,
      helpingVerbs,
      grammarTags,
      category: categories[0] || 'Common Expressions',
      categories,
      sourcePage: docPageNum,
      reviewStatus: 'reviewed'
    });
  }

  // Sort strictly by ID 1..600
  allFormulas.sort((a, b) => a.id - b.id);

  console.log(`\n================ Summary ================`);
  console.log(`Total formulas extracted: ${allFormulas.length}`);
  console.log(`Min ID: ${allFormulas[0].id}, Max ID: ${allFormulas[allFormulas.length - 1].id}`);

  // Validation
  let totalExamples = 0;
  let missingExamplesCount = 0;
  let missingFormulaFieldCount = 0;

  for (let f of allFormulas) {
    totalExamples += f.examples.length;
    if (f.examples.length === 0) missingExamplesCount++;
    if (!f.englishFormula || !f.hindiMeaning) missingFormulaFieldCount++;
  }

  console.log(`Total examples extracted: ${totalExamples}`);
  console.log(`Formulas with 0 examples: ${missingExamplesCount}`);
  console.log(`Formulas with missing fields: ${missingFormulaFieldCount}`);

  // Distinct categories
  const allCategories = new Set();
  allFormulas.forEach(f => f.categories.forEach(c => allCategories.add(c)));
  const categoriesList = Array.from(allCategories).sort().map((name, index) => {
    const count = allFormulas.filter(f => f.categories.includes(name)).length;
    return { id: `cat-${index + 1}`, name, count };
  });

  console.log(`Total categories: ${categoriesList.length}`);
  console.log('Categories:', categoriesList.map(c => `${c.name} (${c.count})`).join(', '));

  return { allFormulas, categoriesList };
}

buildCompleteDataset().then(({ allFormulas, categoriesList }) => {
  fs.writeFileSync('all_formulas_extracted.json', JSON.stringify(allFormulas, null, 2));
  fs.writeFileSync('categories_extracted.json', JSON.stringify(categoriesList, null, 2));
  fs.mkdirSync('src/data', { recursive: true });
  fs.writeFileSync('src/data/formulas.json', JSON.stringify(allFormulas, null, 2));
  fs.writeFileSync('src/data/categories.json', JSON.stringify(categoriesList, null, 2));
  console.log('Successfully written datasets to all_formulas_extracted.json and src/data/!');
}).catch(console.error);
