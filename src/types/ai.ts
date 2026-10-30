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
  | 'phrase-match';

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
