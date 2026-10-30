const AIProvider = require('./AIProvider');

class MockProvider extends AIProvider {
  async generateText({ systemPrompt, userPrompt, context }) {
    const p = userPrompt.toLowerCase();

    // 1. Sentence correction request
    if (systemPrompt.includes('sentence corrector') || p.includes('correct this sentence') || p.includes('mistake')) {
      if (p.includes('he have been working') || p.includes('he have')) {
        return JSON.stringify({
          original: "He have been working.",
          corrected: "He has been working.",
          isCorrect: false,
          explanationHindi: "He के साथ 'has' का उपयोग होता है, 'have' का नहीं। Present Perfect Continuous में Singular Subject (He, She, It) के साथ 'has been' लगता है।",
          grammarTags: ["has been", "present perfect continuous", "subject-verb agreement"],
          suggestedFormulaIds: [207],
          practiceExample: {
            english: "She has been studying since morning.",
            hindi: "वह सुबह से पढ़ाई कर रही है।"
          }
        });
      }

      // Generic correction response
      return JSON.stringify({
        original: userPrompt,
        corrected: userPrompt.replace(/\bhave\b/gi, 'has'),
        isCorrect: !/\b(have|goed|comed|are|is)\b/i.test(userPrompt),
        explanationHindi: "Subject और Helping verb के तालमेल (agreement) का ध्यान रखें।",
        grammarTags: ["helping-verb", "sentence-formula"],
        suggestedFormulaIds: [207, 5, 24],
        practiceExample: {
          english: "I have been learning English.",
          hindi: "मैं इंग्लिश सीख रहा हूँ।"
        }
      });
    }

    // 2. Quiz generation request
    if (systemPrompt.includes('quiz generator') || p.includes('quiz')) {
      return JSON.stringify([
        {
          id: `ai-q-1`,
          type: "hindi-to-english",
          prompt: "सही English अनुवाद चुनें:",
          hindiSubtext: "वह सुबह से पढ़ रहा है।",
          options: [
            "He has been reading since morning.",
            "He have been reading since morning.",
            "He is reading since morning.",
            "He was reading since morning."
          ],
          correctAnswer: "He has been reading since morning.",
          explanationHindi: "Formula #207 (Sub + have/has + been + V+ing) के अनुसार He के साथ 'has been' लगेगा।",
          formulaId: 207,
          difficulty: "beginner"
        },
        {
          id: `ai-q-2`,
          type: "fill-blank",
          prompt: "खाली जगह भरें (Fill in the blank):",
          hindiSubtext: "I _______ a car. (मेरे पास कार है)",
          options: ["have", "has", "had been", "having"],
          correctAnswer: "have",
          explanationHindi: "Formula #2 (Sub + have/has + things) के अनुसार I के साथ 'have' लगेगा।",
          formulaId: 2,
          difficulty: "beginner"
        }
      ]);
    }

    // 3. Example generator request
    if (systemPrompt.includes('example generator') || p.includes('examples banao') || p.includes('example')) {
      return JSON.stringify([
        {
          englishSentence: "I have been waiting for you for two hours.",
          hindiTranslation: "मैं दो घंटे से तुम्हारा इंतज़ार कर रहा हूँ।",
          formulaId: 207,
          grammarNote: "Use 'for' with duration of time (two hours).",
          isAIGenerated: true,
          hindiSegments: [
            { text: "मैं दो घंटे से तुम्हारा इंतज़ार ", highlight: false },
            { text: "कर रहा हूँ", highlight: true },
            { text: "।", highlight: false }
          ],
          englishSegments: [
            { text: "I ", highlight: false },
            { text: "have been", highlight: true },
            { text: " waiting for you for two hours.", highlight: false }
          ]
        },
        {
          englishSentence: "Rohan has been working in this company since 2021.",
          hindiTranslation: "रोहन 2021 से इस कंपनी में काम कर रहा है।",
          formulaId: 207,
          grammarNote: "Use 'since' with a specific starting year (2021).",
          isAIGenerated: true,
          hindiSegments: [
            { text: "रोहन 2021 से इस कंपनी में काम ", highlight: false },
            { text: "कर रहा है", highlight: true },
            { text: "।", highlight: false }
          ],
          englishSegments: [
            { text: "Rohan ", highlight: false },
            { text: "has been", highlight: true },
            { text: " working in this company since 2021.", highlight: false }
          ]
        }
      ]);
    }

    // 4. English Teacher difference question: "would have been aur have been mein kya difference hai?"
    if (p.includes('would have been') && p.includes('have been')) {
      return `नमस्ते! चलिए **'Have been'** और **'Would have been'** के अंतर को आसान हिंदी में समझते हैं:

1. **Have been / Has been (Formula #207):**
   - **अर्थ:** कोई काम भूतकाल (past) में शुरू हुआ और अभी वर्तमान में भी चल रहा है।
   - **Structure:** Sub + have/has + been + V-ing + since/for.
   - **उदाहरण:** "I have been living here for 5 years." (मैं 5 साल से यहाँ रह रहा हूँ।)

2. **Would have been:**
   - **अर्थ:** यह काल्पनिक या शर्तिया (conditional/hypothetical) बात के लिए होता है — "ऐसा हो गया होता" या "हो रहा होता अगर..."
   - **उदाहरण:** "If you had informed me, I would have been ready." (अगर तुमने मुझे बताया होता, तो मैं तैयार रहा होता।)

**मुख्य अंतर:**
- 'Have been' एक वास्तविक क्रिया है जो अभी भी चल रही है।
- 'Would have been' एक काल्पनिक स्थिति है जो नहीं हो सकी।

**शार्ट प्रैक्टिस सवाल:**
"वह 2 घंटे से खेल रहा है" के लिए आप क्या चुनेंगे?
(A) He would have been playing
(B) He has been playing`;
    }

    // Default conversational reply
    if (context && context.englishFormula) {
      return `यह **Formula #${context.id}**: \`${context.englishFormula}\` है।
हिंदी अर्थ: **(${context.hindiMeaning})**

**सरल व्याख्या:**
जब भी आपको हिंदी में "${context.hindiMeaning}" वाला भाव व्यक्त करना हो, तब इस इंग्लिश फॉर्मूले का प्रयोग किया जाता है।

**उदाहरण:**
- **Hindi:** ${context.examples?.[0]?.hindi || 'बोलकर तो दिखा।'}
- **English:** ${context.examples?.[0]?.english || 'Show me to speak.'}

क्या आप इसके और उदाहरण देखना चाहते हैं या कोई वाक्य बनाकर टेस्ट करना चाहते हैं?`;
    }

    return `नमस्ते! मैं आपका AI English Teacher हूँ। आप मुझसे इंग्लिश ग्रामर, किसी भी Sentence Formula (1 से 600), या अपने वाक्यों के बारे में पूछ सकते हैं। आप हिंदी या इंग्लिश किसी भी भाषा में सवाल पूछ सकते हैं!`;
  }
}

module.exports = MockProvider;
