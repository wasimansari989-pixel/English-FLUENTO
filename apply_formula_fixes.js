const fs = require('fs');

function fixDataset(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const formulas = JSON.parse(content);

  // 1. Fix Formula 295 to exact user reference: Is / am / are + going to + V 1 (काम करने वाला है)
  const f295 = formulas.find(f => f.id === 295);
  if (f295) {
    f295.englishFormula = 'Sub + is/am/are + going to + V1 + object';
    f295.hindiMeaning = 'काम करने वाला है (वाला हूँ, वाली है, वाले हैं)';
    f295.helpingVerbs = ['is going to', 'am going to', 'are going to', 'going to', 'is', 'am', 'are'];
    f295.grammarTags = ['am/is/are', 'going to'];
    f295.examples = [
      {
        id: '295-1',
        hindiSegments: [
          { text: 'मैं कल जाने ', highlight: false },
          { text: 'वाला हूँ', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'I ', highlight: false },
          { text: 'am going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' go tomorrow.', highlight: false }
        ],
        originalHindi: 'मैं कल जाने वाला हूँ.',
        originalEnglish: 'I am going to go tomorrow.',
        reviewStatus: 'reviewed'
      },
      {
        id: '295-2',
        hindiSegments: [
          { text: 'वह यहाँ आने ', highlight: false },
          { text: 'वाली है', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'She ', highlight: false },
          { text: 'is going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' come here.', highlight: false }
        ],
        originalHindi: 'वह यहाँ आने वाली है.',
        originalEnglish: 'She is going to come here.',
        reviewStatus: 'reviewed'
      },
      {
        id: '295-3',
        hindiSegments: [
          { text: 'हम मंगलवार को घर जाने ', highlight: false },
          { text: 'वाले है', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'We ', highlight: false },
          { text: 'are going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' go home tomorrow.', highlight: false }
        ],
        originalHindi: 'हम मंगलवार को घर जाने वाले है.',
        originalEnglish: 'We are going to go home tomorrow.',
        reviewStatus: 'reviewed'
      },
      {
        id: '295-4',
        hindiSegments: [
          { text: 'नेहा आज खाना बनाने ', highlight: false },
          { text: 'वाली है', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'Neha ', highlight: false },
          { text: 'is going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' cook today.', highlight: false }
        ],
        originalHindi: 'नेहा आज खाना बनाने वाली है.',
        originalEnglish: 'Neha is going to cook today.',
        reviewStatus: 'reviewed'
      },
      {
        id: '295-5',
        hindiSegments: [
          { text: 'हम खेलने ', highlight: false },
          { text: 'वाले है', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'We ', highlight: false },
          { text: 'are going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' play.', highlight: false }
        ],
        originalHindi: 'हम खेलने वाले है.',
        originalEnglish: 'We are going to play.',
        reviewStatus: 'reviewed'
      }
    ];
  }

  // 2. Fix Formula 297 to user reference: Was / were + going to + V1 (काम करने वाले थे)
  const f297 = formulas.find(f => f.id === 297);
  if (f297) {
    f297.englishFormula = 'Sub + was/were + going to + V1 + object';
    f297.hindiMeaning = 'काम करने वाले थे (वाला था, वाली थी, वाले थे)';
    f297.helpingVerbs = ['was going to', 'were going to', 'going to', 'was', 'were'];
    f297.grammarTags = ['was/were', 'going to'];
    f297.examples = [
      {
        id: '297-1',
        hindiSegments: [
          { text: 'मैं कल जाने ', highlight: false },
          { text: 'वाला था', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'I ', highlight: false },
          { text: 'was going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' go yesterday.', highlight: false }
        ],
        originalHindi: 'मैं कल जाने वाला था.',
        originalEnglish: 'I was going to go yesterday.',
        reviewStatus: 'reviewed'
      },
      {
        id: '297-2',
        hindiSegments: [
          { text: 'वह यहाँ आने ', highlight: false },
          { text: 'वाली थी', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'She ', highlight: false },
          { text: 'was going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' come here.', highlight: false }
        ],
        originalHindi: 'वह यहाँ आने वाली थी.',
        originalEnglish: 'She was going to come here.',
        reviewStatus: 'reviewed'
      },
      {
        id: '297-3',
        hindiSegments: [
          { text: 'हम मंगलवार को घर जाने ', highlight: false },
          { text: 'वाले थे', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'We ', highlight: false },
          { text: 'were going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' go home on yesterday.', highlight: false }
        ],
        originalHindi: 'हम मंगलवार को घर जाने वाले थे.',
        originalEnglish: 'We were going to go home on yesterday.',
        reviewStatus: 'reviewed'
      },
      {
        id: '297-4',
        hindiSegments: [
          { text: 'नेहा आज खाना बनाने ', highlight: false },
          { text: 'वाली थी', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'Neha ', highlight: false },
          { text: 'was going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' cook today.', highlight: false }
        ],
        originalHindi: 'नेहा आज खाना बनाने वाली थी.',
        originalEnglish: 'Neha was going to cook today.',
        reviewStatus: 'reviewed'
      },
      {
        id: '297-5',
        hindiSegments: [
          { text: 'हम खेलने ', highlight: false },
          { text: 'वाले थे', highlight: true, alignmentGroup: 'g1' },
          { text: '.', highlight: false }
        ],
        englishSegments: [
          { text: 'We ', highlight: false },
          { text: 'were going to', highlight: true, alignmentGroup: 'g1' },
          { text: ' play.', highlight: false }
        ],
        originalHindi: 'हम खेलने वाले थे.',
        originalEnglish: 'We were going to play.',
        reviewStatus: 'reviewed'
      }
    ];
  }

  // 3. Remove "What kind of way is this to" concatenated noise from all formulas other than 296
  let cleanedHallucinations = 0;
  formulas.forEach(f => {
    if (f.id !== 296 && f.englishFormula.includes('What kind of way is this to')) {
      f.englishFormula = f.englishFormula.replace(/\s*What kind of way is this to[^\n]*/gi, '').trim();
      cleanedHallucinations++;
    }

    // 4. Fix misplaced verb numbers like "+ V + object. 1" -> "+ V1 + object"
    f.englishFormula = f.englishFormula
      .replace(/\+\s*V\s*\+\s*object\.\s*1/gi, '+ V1 + object')
      .replace(/\+\s*V\s*\+\s*object\?\s*1/gi, '+ V1 + object?')
      .replace(/\+\s*V\s*\+\s*object\.\s*3/gi, '+ V3 + object')
      .replace(/\+\s*V\s*\+\s*object\.\s*2/gi, '+ V2 + object')
      .replace(/\+\s*V\s*\.\s*1/gi, '+ V1.')
      .replace(/\+\s*V\s*\.\s*3/gi, '+ V3.');
  });

  fs.writeFileSync(filePath, JSON.stringify(formulas, null, 2), 'utf8');
  console.log(`Successfully updated ${filePath}. Cleaned hallucinations in ${cleanedHallucinations} formulas.`);
}

fixDataset('./src/data/formulas.json');
fixDataset('./all_formulas_extracted.json');
