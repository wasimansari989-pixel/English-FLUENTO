import { SentenceSegment } from './formula';

export type ExplanationMode = 'beginner' | 'intermediate' | 'advanced';

export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  formulaId?: number;
  suggestedFollowUps?: string[];
};

export type SentenceCorrectionResult = {
  original: string;
  corrected: string;
  isCorrect: boolean;
  explanationHindi: string;
  hindiMeaning?: string | null;
  betterAlternative?: string | null;
  grammarTags: string[];
  suggestedFormulaIds: number[];
  practiceExample?: {
    english: string;
    hindi: string;
  };
};

export type AIGeneratedExample = {
  englishSentence: string;
  hindiTranslation: string;
  formulaId: number;
  grammarNote?: string;
  hindiSegments: SentenceSegment[];
  englishSegments: SentenceSegment[];
  isAIGenerated: boolean;
};

export type QuizQuestionType =
  | 'hindi-to-english'
  | 'english-to-hindi'
  | 'choose-formula'
  | 'fill-blank'
  | 'helping-verb'
  | 'correct-sentence'
  | 'grammar-correction'
  | 'tense-practice'
  | 'vocabulary-practice'
  | 'phrase-match';

export type MistakeRecord = {
  id: string;
  questionId: string;
  type: QuizQuestionType;
  prompt: string;
  hindiSubtext?: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanationHindi: string;
  formulaId: number;
  category?: string;
  difficulty: ExplanationMode;
  timestamp: number;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  hindiSubtext?: string;
  options: string[];
  correctAnswer: string;
  explanationHindi: string;
  formulaId: number;
  difficulty: ExplanationMode;
  isAIGenerated?: boolean;
  highlightPhrase?: {
    english: string;
    hindi: string;
  };
};

export type ConversationScenario = {
  id: string;
  title: string;
  titleHindi: string;
  description: string;
  initialPrompt: string;
  icon: string;
};

export type ConversationMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  correctionHindi?: string;
  correctedEnglish?: string;
  timestamp: number;
};
