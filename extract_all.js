const fs = require('fs');
const pdf = require('pdf-parse');

async function extractAll() {
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

        // Sort top to bottom, left to right
        items.sort((a, b) => b.y - a.y || a.x - b.x);

        // Group into lines by Y coordinate
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

  console.log(`Parsed ${pages.length} pages total.`);

  const formulas = [];
  const issues = [];

  for (let i = 2; i < pages.length; i++) {
    const page = pages[i];
    const lines = page.lines;

    // Find header
    let formulaId = null;
    let headerLineIdx = -1;
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const m = lines[lIdx].text.match(/English\s+Sentence\s+Formula\s*[-–—]\s*(\d+)/i);
      if (m) {
        formulaId = parseInt(m[1], 10);
        headerLineIdx = lIdx;
        break;
      }
    }

    if (!formulaId) {
      issues.push({ page: page.pageNum, issue: 'No formula header found' });
      continue;
    }

    // Page number in document
    let docPageNum = page.pageNum - 1;
    const pageNumLine = lines.find(l => l.text.includes('| Page'));
    if (pageNumLine) {
      const pm = pageNumLine.text.match(/(\d+)\s*\|\s*Page/i);
      if (pm) docPageNum = parseInt(pm[1], 10);
    }

    // Find "Example :" line
    let exampleLineIdx = lines.findIndex(l => /Example\s*:/i.test(l.text));
    if (exampleLineIdx === -1) {
      // Sometimes just "Example"
      exampleLineIdx = lines.findIndex(l => /Example/i.test(l.text));
    }

    // Lines between header and Example:
    // This is where English structure and Hindi meaning usually live
    let preExampleLines = [];
    if (headerLineIdx !== -1 && exampleLineIdx !== -1 && exampleLineIdx > headerLineIdx) {
      preExampleLines = lines.slice(headerLineIdx + 1, exampleLineIdx);
    }

    // Also look after example lines (some pages might have formula box at the bottom)
    // Examples start after exampleLineIdx
    let exampleLines = [];
    let postExampleLines = [];
    if (exampleLineIdx !== -1) {
      const remaining = lines.slice(exampleLineIdx + 1);
      // Filter out footer
      for (let rem of remaining) {
        if (rem.text.includes('| Page')) continue;
        exampleLines.push(rem);
      }
    }

    formulas.push({
      id: formulaId,
      pdfPage: page.pageNum,
      docPage: docPageNum,
      preLines: preExampleLines.map(l => l.text),
      allLines: lines.map(l => `[Y=${l.y}] ${l.text}`)
    });
  }

  console.log(`Extracted formulas count: ${formulas.length}`);
  console.log(`Issues count: ${issues.length}`);
  
  // Let's inspect preLines of first 10 formulas
  for (let f of formulas.slice(0, 10)) {
    console.log(`\n--- Formula ${f.id} (Page ${f.pdfPage}) ---`);
    console.log('PreLines:', f.preLines);
  }

  // Let's also inspect preLines of formulas 50, 100, 200, 300, 400, 500, 600
  for (let id of [50, 100, 200, 300, 400, 500, 600]) {
    const f = formulas.find(x => x.id === id);
    if (f) {
      console.log(`\n--- Formula ${f.id} (Page ${f.pdfPage}) ---`);
      console.log('PreLines:', f.preLines);
    }
  }
}

extractAll().catch(console.error);
