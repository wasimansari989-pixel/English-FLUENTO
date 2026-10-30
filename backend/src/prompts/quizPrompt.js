function buildQuizSystemPrompt(formula, count = 5) {
  return `You are an expert English quiz generator for Hindi speakers learning English.
Generate ${count} interactive quiz questions based on Formula #${formula.id}:
Formula: "${formula.englishFormula}"
Hindi Meaning: "(${formula.hindiMeaning})"

Output MUST be a valid JSON array of objects with the following schema:
[
  {
    "id": "q-1",
    "type": "hindi-to-english" | "english-to-hindi" | "choose-formula" | "fill-blank" | "helping-verb",
    "prompt": "The question prompt in Hindi or English",
    "hindiSubtext": "Optional sentence or context in Hindi",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact matching string from options",
    "explanationHindi": "Why this answer is correct in simple Hindi",
    "formulaId": ${formula.id},
    "difficulty": "beginner"
  }
]

Do not include any conversational text outside the JSON array.`;
}

module.exports = { buildQuizSystemPrompt };
