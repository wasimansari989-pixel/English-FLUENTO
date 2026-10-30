const fs = require('fs');

// Normalize function for fuzzy matching while keeping track of indices
function segmentSentence(sentence, highlightPatterns, alignmentGroup = 'g1') {
  if (!sentence || typeof sentence !== 'string') {
    return [{ text: '', highlight: false }];
  }

  if (!highlightPatterns || highlightPatterns.length === 0) {
    return [{ text: sentence, highlight: false }];
  }

  // Find all match ranges [start, end]
  const ranges = [];

  for (let pat of highlightPatterns) {
    if (!pat) continue;
    let regex;
    try {
      if (typeof pat === 'string') {
        // Escape special chars
        const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        regex = new RegExp(escaped, 'gi');
      } else {
        regex = pat;
      }

      let match;
      while ((match = regex.exec(sentence)) !== null) {
        ranges.push({ start: match.index, end: match.index + match[0].length, group: alignmentGroup });
        if (!regex.global) break;
      }
    } catch (e) {
      console.warn('Regex error for pat:', pat, e);
    }
  }

  if (ranges.length === 0) {
    // If no direct regex match, try relaxed match (ignoring OCR diacritic variations)
    // E.g. "िे" vs "दे", "िो" vs "दो", "हाँ" vs "हूँ"
    return [{ text: sentence, highlight: false }];
  }

  // Sort ranges and merge overlaps
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (let r of ranges) {
    if (merged.length === 0) {
      merged.push(r);
    } else {
      const last = merged[merged.length - 1];
      if (r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
      } else {
        merged.push(r);
      }
    }
  }

  // Build segments
  const segments = [];
  let curIndex = 0;

  for (let m of merged) {
    if (m.start > curIndex) {
      segments.push({
        text: sentence.slice(curIndex, m.start),
        highlight: false
      });
    }
    segments.push({
      text: sentence.slice(m.start, m.end),
      highlight: true,
      alignmentGroup: m.group
    });
    curIndex = m.end;
  }

  if (curIndex < sentence.length) {
    segments.push({
      text: sentence.slice(curIndex),
      highlight: false
    });
  }

  // Verification check: text preserved exactly
  const reconstructed = segments.map(s => s.text).join('');
  if (reconstructed !== sentence) {
    console.error(`Mismatch! Original: "${sentence}" vs Reconstructed: "${reconstructed}"`);
  }

  return segments;
}

// Test sample
const s1 = "बोलकर तो दिखा.";
const segs1 = segmentSentence(s1, ["तो दिखा"]);
console.log('Test 1 Hindi segments:', JSON.stringify(segs1));

const s2 = "Show me to speak.";
const segs2 = segmentSentence(s2, ["Show me to"]);
console.log('Test 2 English segments:', JSON.stringify(segs2));

const s3 = "मेरे पास कार है.";
const segs3 = segmentSentence(s3, ["पास", "है"]);
console.log('Test 3 Hindi segments:', JSON.stringify(segs3));

const s4 = "I have a car.";
const segs4 = segmentSentence(s4, ["have"]);
console.log('Test 4 English segments:', JSON.stringify(segs4));

module.exports = { segmentSentence };
