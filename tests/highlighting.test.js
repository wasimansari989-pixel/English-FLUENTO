const test = require('node:test');
const assert = require('node:assert');
const { segmentSentence } = require('../segmenter');

test('Highlighting: Single phrase segmenting in Hindi and English', () => {
  const hinSentence = 'बोलकर तो दिखा.';
  const hinSegments = segmentSentence(hinSentence, ['तो दिखा'], 'g1');

  assert.strictEqual(hinSegments.length, 3);
  assert.deepStrictEqual(hinSegments[0], { text: 'बोलकर ', highlight: false });
  assert.deepStrictEqual(hinSegments[1], { text: 'तो दिखा', highlight: true, alignmentGroup: 'g1' });
  assert.deepStrictEqual(hinSegments[2], { text: '.', highlight: false });
  assert.strictEqual(hinSegments.map(s => s.text).join(''), hinSentence);

  const engSentence = 'Show me to speak.';
  const engSegments = segmentSentence(engSentence, ['Show me to'], 'g1');

  assert.strictEqual(engSegments.length, 2);
  assert.deepStrictEqual(engSegments[0], { text: 'Show me to', highlight: true, alignmentGroup: 'g1' });
  assert.deepStrictEqual(engSegments[1], { text: ' speak.', highlight: false });
  assert.strictEqual(engSegments.map(s => s.text).join(''), engSentence);
});

test('Highlighting: Multiple discontinuous highlight segments (e.g. पास ... है)', () => {
  const sentence = 'मेरे पास कार है.';
  const segments = segmentSentence(sentence, ['पास', 'है'], 'g1');

  assert.strictEqual(segments.map(s => s.text).join(''), sentence);
  const highlighted = segments.filter(s => s.highlight);
  assert.strictEqual(highlighted.length, 2);
  assert.strictEqual(highlighted[0].text, 'पास');
  assert.strictEqual(highlighted[1].text, 'है');
});

test('Highlighting: No match returns single unhighlighted segment without mutation', () => {
  const sentence = 'A completely unrelated sentence.';
  const segments = segmentSentence(sentence, ['unmatched phrase']);

  assert.strictEqual(segments.length, 1);
  assert.strictEqual(segments[0].text, sentence);
  assert.strictEqual(segments[0].highlight, false);
});
