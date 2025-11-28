




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

export type CollageStyle = 
  | 'newspaper' 
  | 'typewriter' 
  | 'handwritten' 
  | 'magazine-cutout' 
  | 'label' 
  | 'minimal' 
  | 'bold-stamp'
  | 'receipt'
  | 'prescription'
  | 'warning'
  | 'manual';

export interface CollageFragment {
  id: string;
  text: string;
  style: CollageStyle;
  rotation: number;
  x: number;
  y: number;
  
  // New: Image Support
  type?: 'text' | 'image';
  imageUrl?: string;
  
  // Visual Customization Properties
  width?: number; // Optional override
  height?: number; // Optional override
  fontSize?: number;
  backgroundColor?: string;
  color?: string;
  opacity?: number; // 0 to 1
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
  
  // Advanced Typography
  fontFamily?: string;
  fontWeight?: string; // 'normal' | 'bold'
  hasShadow?: boolean;
  
  zIndex?: number;
}

// --- Generator Settings ---

export type VocabularyDifficulty = 'High School' | 'CET-4' | 'CET-6' | 'IELTS/TOEFL' | 'GRE';

export type ColorTheme = 'random' | 'morandi' | 'retro' | 'neon' | 'monochrome' | 'pastel' | 'forest';

export interface GenerationSettings {
  difficulty: VocabularyDifficulty;
  quantity: number; // 10 - 50
  stylePreference: CollageStyle | 'mixed';
  colorTheme: ColorTheme;
}

export type CanvasBackground = 'dots' | 'grid' | 'paper' | 'dark' | 'clay';

// --- Export Templates ---

export type ExportTemplate = 'simple' | 'receipt' | 'polaroid' | 'vinyl' | 'newspaper';

export type SealStyle = 'square' | 'circle' | 'oval';

// --- Doodle Types ---

export type BrushType = 'pen' | 'marker' | 'highlighter';

export interface DoodleStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  type: BrushType;
}