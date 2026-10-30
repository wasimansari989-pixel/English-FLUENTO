# English Formula 600 — AI-Powered English Learning App

A production-grade, offline-first mobile application designed for Hindi-speaking beginners to master spoken and written English, built upon the complete dataset of **600 English Sentence Formulas** and **3,000 verified Hindi-English examples**.

---

## 🌟 Key Features

1. **Complete 600 Formula Dataset**:
   - Every formula numbered **1 through 600** extracted directly from `600 English Sentence Formula pdf.pdf`.
   - **3,000 verified examples** (5 examples per formula) with original Hindi meanings and English constructions.
   - Structured JSON schema preserving original texts, tags, helping verbs, and page references.

2. **Synchronized Red Phrase Highlighting**:
   - Reusable `HighlightedSentence.tsx` rendering matching Hindi and English phrases in `#E11D48` with a matching red underline (`textDecorationLine: 'underline'`).
   - Seamless line wrapping without breaking Devanagari ligatures/matras.
   - Accessibility compliant (`accessibilityRole="text"`, full sentence screen-reader label).

3. **100% Offline Core Learning**:
   - All 600 formulas, search, helping-verb filters, bookmarks, and deterministic quizzes work entirely offline without internet or server connection.

4. **AI Personal English Teacher**:
   - Bilingual (Hindi / Hinglish / English) tutoring.
   - Formula-aware context (opening Formula 207 passes formula details to AI).
   - 3 explanation modes: **Beginner (सरल हिंदी)**, **Intermediate**, and **Advanced**.
   - Suggested follow-up prompt chips for effortless conversational learning.

5. **AI English Sentence Corrector**:
   - Instant grammar check returning structured JSON with corrected sentence, Hindi explanation, grammar tags, and direct links to matching formulas in the 600 dataset.

6. **AI Example & Quiz Generator**:
   - On-demand generation of 5 new everyday examples for any formula with synchronized red highlighting.
   - Deterministic and AI-generated quiz questions (Hindi-to-English, English-to-Hindi, Choose Formula, Fill in the Blank, Helping Verbs).

7. **AI Conversation Practice**:
   - 6 real-life roleplay scenarios (Self Introduction, Restaurant, Shopping, Job Interview, Asking Directions, Talking to a Friend).
   - Turn-by-turn dialogue with gentle Hindi grammar corrections.

8. **Secure Multi-Provider AI Architecture**:
   - API keys are **never** bundled into the mobile app.
   - Node.js Express backend mediates AI requests with rate limits, daily quotas, input length validation, and smart RAG formula retrieval.
   - Provider adapters for **Google Gemini** (free tier), **Groq** (free tier), and **MockProvider** (offline testing).

---

## 📁 Project Architecture

```text
EnglishApp/
├── app/                           # Expo Router screens
│   ├── _layout.tsx                # Stack Navigation & Theme
│   ├── index.tsx                  # Home Dashboard (Hero, Modules, Spotlight)
│   ├── formulas/
│   │   ├── index.tsx              # All 600 Formulas (Category filters, jump-to-ID)
│   │   └── [id].tsx               # Formula Details (Highlighted examples, AI Gen)
│   ├── search.tsx                 # Dual Search (Local Offline + Ask AI)
│   ├── helping-verbs.tsx          # Helping Verbs Index & Filters
│   ├── ai-teacher.tsx             # AI English Teacher Chat
│   ├── ai-corrector.tsx           # AI Sentence Corrector
│   ├── conversation-practice.tsx  # Roleplay Conversational Practice
│   ├── practice.tsx               # Daily Practice & Adaptive Quizzes
│   ├── bookmarks.tsx              # Saved Formulas
│   ├── progress.tsx               # Analytics, Weak Topics & Reset
│   └── settings.tsx               # Backend URL, AI Status, & Guide
│
├── src/
│   ├── components/                # Reusable UI Components
│   │   ├── HighlightedSentence.tsx# Synchronized Red Underline Text Renderer
│   │   ├── FormulaCard.tsx        # Formula Card with Yellow Box
│   │   ├── ExamplePair.tsx        # Paired Hindi-English with Highlighting
│   │   ├── SearchBar.tsx          # Instant Search Input
│   │   ├── AIChatMessage.tsx      # Chat Bubbles with Follow-Up Chips
│   │   ├── FormulaContextCard.tsx # Pinned Active Formula Banner
│   │   └── QuizQuestion.tsx       # Interactive Quiz Component
│   ├── data/
│   │   ├── formulas.json          # Complete 600 formulas & 3,000 examples
│   │   └── categories.json        # 15 grammar categories with counts
│   ├── database/
│   │   ├── storage.ts             # Cross-platform AsyncStorage / Memory wrapper
│   │   ├── bookmarkRepository.ts  # Bookmark persistence
│   │   └── progressRepository.ts  # Quiz scores, streak, and mistake tracker
│   ├── search/
│   │   ├── normalize.ts           # Bilingual Hindi/English text normalizer
│   │   └── formulaSearch.ts       # Ranked multi-field search engine
│   ├── services/
│   │   └── aiClient.ts            # Client-side AI HTTP service & offline fallback
│   └── types/
│       ├── formula.ts             # Typed data model (Formula, Example, Segment)
│       └── ai.ts                  # AI chat, correction, quiz, and scenario types
│
├── backend/                       # Secure AI Backend Service
│   ├── src/
│   │   ├── providers/
│   │   │   ├── AIProvider.js      # Base Provider Interface
│   │   │   ├── GeminiProvider.js  # Google Gemini REST integration
│   │   │   ├── GroqProvider.js    # Groq API integration
│   │   │   └── MockProvider.js    # Offline intelligent fallback
│   │   ├── routes/
│   │   │   └── ai.js              # Express Router for AI endpoints
│   │   ├── services/
│   │   │   ├── quotaService.js    # Daily limits and rate limiting
│   │   │   ├── formulaRetrieval.js# RAG retrieval of top-k formulas
│   │   │   └── responseValidation.js # Schema validation & JSON recovery
│   │   ├── prompts/
│   │   │   ├── tutorPrompt.js     # Teacher prompt builder
│   │   │   ├── correctionPrompt.js# Corrector prompt builder
│   │   │   └── quizPrompt.js      # Quiz prompt builder
│   │   └── server.js              # Express entry point
│   ├── .env.example
│   └── package.json
│
├── tests/                         # Automated Unit & Integration Tests
│   ├── formulas.test.js           # Validates all 600 formulas & 3,000 examples
│   ├── highlighting.test.js       # Validates red phrase segmenter
│   ├── search.test.js             # Validates exact ID & text search
│   └── ai-schema.test.js          # Validates response schemas & quotas
│
├── app.json                       # Expo configuration
├── package.json                   # App dependencies
├── tsconfig.json                  # TypeScript configuration
└── VALIDATION_REPORT.md           # Source dataset validation report
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **npm** or **yarn**

### 2. Install App Dependencies
In the root directory:
```bash
npm install
```

### 3. Start the Backend AI Server
In a separate terminal:
```bash
cd backend
npm install
npm start
```
The backend will launch at `http://localhost:3001`.

### 4. Start the Mobile App (Expo)
In the project root:
```bash
# Start Metro bundler
npx expo start

# Or run directly on Web:
npm run web

# Or run on Android emulator / device:
npm run android
```

---

## 🔑 Configuring Free-Tier AI Providers

The backend supports configurable AI providers via `backend/.env`.

### Option A: Google Gemini (Recommended Free Tier)
1. Go to [Google AI Studio](https://aistudio.google.com/) and generate a free API key.
2. In `backend/.env`:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### Option B: Groq (Ultra-Fast Free Tier)
1. Go to [Groq Console](https://console.groq.com/) and generate a free API key.
2. In `backend/.env`:
```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Option C: Mock Provider (Default / Offline)
If no API key is provided, the backend automatically uses `MockProvider`, which provides instant, realistic, and offline answers for testing!

---

## 🧪 Running Automated Tests

Run the test suite:
```bash
npm test
```
All 14 unit and integration tests will execute and verify dataset integrity, red phrase segmentation, formula search, and AI schemas.

---

## 📱 Android Build Instructions

### Method A: EAS Build (Recommended for Release APK / AAB)
1. Install EAS CLI:
```bash
npm install -g eas-cli
```
2. Log in to your Expo account:
```bash
eas login
```
3. Configure build:
```bash
eas build:configure
```
4. Build Android standalone APK:
```bash
eas build -p android --profile preview
```

### Method B: Local Native Android Build
1. Prebuild native Android project files:
```bash
npx expo prebuild --platform android
```
2. Build debug APK using Gradle:
```bash
cd android
./gradlew assembleDebug
```
The resulting APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📋 Status & Completion

- **All 600 Formulas**: Complete & verified.
- **3,000 Source Examples**: Extracted & preserved.
- **Red Underline Highlighting**: Integrated on card, detail, and AI screens.
- **Helping Verbs & Categories**: Fully indexed.
- **AI Teacher, Corrector, Quiz, Conversation**: Fully implemented with safe fallback.
- **Offline Mode**: 100% operational for all core learning modules.
