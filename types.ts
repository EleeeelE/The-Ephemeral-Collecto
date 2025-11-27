
export interface SensoryMoment {
  haiku: {
    english: string;
    chinese: string;
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

// --- New Modules Types ---

export enum AppMode {
  COLLECTOR = 'COLLECTOR',
  POET = 'POET'
}

export type CollageStyle = 'newspaper' | 'typewriter' | 'handwritten' | 'magazine-cutout';

export interface CollageFragment {
  id: string;
  text: string;
  style: CollageStyle;
  rotation: number;
  x: number;
  y: number;
  
  // Visual Customization Properties
  width?: number; // Optional override
  height?: number; // Optional override
  fontSize?: number;
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  zIndex?: number;
}

// --- Generator Settings ---

export type VocabularyDifficulty = 'High School' | 'CET-4' | 'CET-6' | 'IELTS/TOEFL' | 'GRE';

export interface GenerationSettings {
  difficulty: VocabularyDifficulty;
  quantity: number; // 10 - 50
  stylePreference: CollageStyle | 'mixed';
}

export type CanvasBackground = 'dots' | 'grid' | 'paper' | 'dark' | 'clay';
