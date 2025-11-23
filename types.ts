
export interface SensoryMoment {
  haiku: {
    japanese: string;
    reading: string;
    translation: string;
  };
  senses: {
    auditory: string;
    tactile_temperature: string;
    olfactory: string;
  };
  insight: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PRINTING = 'PRINTING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  id: string;
  imageUrl: string;
  timestamp: string;
  data: SensoryMoment | null;
  // Canvas properties
  x: number;
  y: number;
  rotation: number;
}

export interface WordAnalysis {
  definition: string; // A poetic definition
  nuance: string; // Cultural or sensory connection
}

export interface VocabularyItem {
  id: string;
  word: string;
  sourceId: string; // Links back to AnalysisResult.id
  timestamp: string;
  contextSnippet?: string; // The phrase where it came from (optional)
  analysis?: WordAnalysis | null; // Cached AI analysis
  isAnalyzing?: boolean; // Loading state
}
