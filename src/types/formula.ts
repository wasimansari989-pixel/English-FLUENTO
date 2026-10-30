export type SentenceSegment = {
  text: string;
  highlight: boolean;
  alignmentGroup?: string;
};

export type SentenceExample = {
  id: string;
  hindiSegments: SentenceSegment[];
  englishSegments: SentenceSegment[];
  originalHindi?: string;
  originalEnglish?: string;
  correctedHindi?: string;
  correctedEnglish?: string;
  reviewStatus: 'pending' | 'reviewed';
};

export type SentenceFormula = {
  id: number;
  title: string;
  englishFormula: string;
  hindiMeaning: string;
  examples: SentenceExample[];
  helpingVerbs: string[];
  grammarTags: string[];
  category: string;
  categories?: string[];
  sourcePage?: number;
  reviewStatus: 'pending' | 'reviewed';
};

export type FormulaCategory = {
  id: string;
  name: string;
  count: number;
  description?: string;
  icon?: string;
};

export type HelpingVerbGroup = {
  verb: string;
  count: number;
  formulaIds: number[];
};
