



import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SensoryMoment, WordAnalysis, CollageFragment, GenerationSettings } from "../types";

// Initialize the Gemini client
// The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are not an AI assistant. You are a digital poet observing the world through the lens of "Mono no aware" (物哀) — the pathos of things, a sensitivity to ephemera and the passage of time.

Your task is to observe the user's image and translate the visual surface into a multi-dimensional sensory moment.

**Language Rule**: The default language for descriptions and insights is **Chinese (Simplified)**.

Your output must be a JSON object.

Guidelines:
1. **The Essence (Poetry)**: Compose a short, free-verse poem or Haiku in **English** (to serve as the 'foreign' aesthetic object). Provide a **Chinese** translation.
2. **Sensory Expansion (Use Chinese)**:
   - **Auditory (听觉)**: What subtle sound exists in this frozen moment? Describe it in **Chinese**. (e.g., "远处的雷声", "雨滴落在旧铁皮上的节奏").
   - **Tactile (触觉)**: Is the air humid, cold, sticky? Is the surface rough? Describe it in **Chinese**.
   - **Olfactory (嗅觉)**: What does this scene smell like? Describe it in **Chinese**. (e.g., "潮湿的尘土味", "生锈的铁腥味").
3. **Insight (顿悟)**: A bittersweet philosophical reflection on why this moment matters. Write it in **Chinese**.

Tone: Poetic, restrained, melancholic but beautiful.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    haiku: {
      type: Type.OBJECT,
      properties: {
        english: { type: Type.STRING, description: "The poem in English" },
        chinese: { type: Type.STRING, description: "The poem translated to Chinese" },
      },
      required: ["english", "chinese"],
    },
    senses: {
      type: Type.OBJECT,
      properties: {
        auditory: { type: Type.STRING, description: "Imagined subtle sounds in Chinese" },
        tactile_temperature: { type: Type.STRING, description: "Imagined touch and air quality in Chinese" },
        olfactory: { type: Type.STRING, description: "Imagined smells in Chinese" },
      },
      required: ["auditory", "tactile_temperature", "olfactory"],
    },
    insight: { type: Type.STRING, description: "Philosophical reflection on time and impermanence in Chinese" },
  },
  required: ["haiku", "senses", "insight"],
};

const WORD_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    definition: { type: Type.STRING, description: "A poetic definition of the word in Chinese." },
    nuance: { type: Type.STRING, description: "The sensory weight or origin of this word in Chinese." },
  },
  required: ["definition", "nuance"],
};

const COLLAGE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      style: { type: Type.STRING, enum: ['newspaper', 'typewriter', 'handwritten', 'magazine-cutout', 'label', 'minimal', 'bold-stamp', 'receipt', 'prescription', 'warning'] },
      rotation: { type: Type.NUMBER, description: "Random rotation between -15 and 15" },
    },
    required: ["text", "style", "rotation"],
  },
};

const STORAGE_KEY_LAST_REQUEST = 'gemini_last_request_ts';

// Randomization Arrays
const RANDOM_FONTS = [
  '"Playfair Display", serif',
  '"Anton", sans-serif',
  '"Courier Prime", monospace',
  '"Permanent Marker", cursive',
  '"Space Mono", monospace',
  '"Ma Shan Zheng", cursive',
  '"ZCOOL XiaoWei", serif',
  '"ZCOOL KuaiLe", cursive',
  '"Long Cang", cursive',
  '"Liu Jian Mao Cao", cursive'
];

// Palettes
const PALETTES = {
    random: {
        text: ['#000000', '#2c2c2c', '#1a365d', '#713f12', '#b91c1c', '#047857', '#4b5563'],
        bg: ['#ffffff', '#f0f0f0', '#fffdcb', '#e0e5ec', '#fef08a', '#f0f8ff', 'transparent', 'transparent']
    },
    morandi: {
        text: ['#4a4a4a', '#5f5f5f', '#2c2c2c', '#3e3e3e', '#5e503f', '#354f52'],
        bg: ['#d5c6be', '#c0c0c0', '#e0e5ec', '#b0b8b4', '#8a97a6', '#d9d0c7', '#f2e9e4', '#9a8c98']
    },
    retro: {
        text: ['#264653', '#e76f51', '#f4a261', '#f0ebd8', '#2a9d8f'],
        bg: ['#e9c46a', '#f4a261', '#e76f51', '#264653', '#2a9d8f', '#f0ebd8', '#d62828', '#fcbf49']
    },
    neon: {
        text: ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#ffffff'],
        bg: ['#2c2c2c', '#000000', '#1a1a1a', '#111827', '#312e81', '#4c1d95']
    },
    monochrome: {
        text: ['#000000', '#2c2c2c', '#ffffff', '#171717'],
        bg: ['#ffffff', '#f0f0f0', '#e0e0e0', '#cccccc', '#2c2c2c', '#000000', '#525252']
    },
    pastel: {
        text: ['#555555', '#777777', '#2c2c2c', '#6d6875'],
        bg: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e6e6fa', '#ffd1dc', '#c1c6fc']
    },
    forest: {
        text: ['#fefae0', '#dda15e', '#bc6c25', '#e9edc9'],
        bg: ['#283618', '#606c38', '#588157', '#344e41', '#a3b18a', '#3a5a40']
    }
};

/**
 * Rate Limited Queue
 * Ensures we don't exceed the Free Tier's RPM (Requests Per Minute) limits
 * by serializing requests and adding a minimum delay.
 * Uses LocalStorage to persist limits across page reloads.
 */
class RequestQueue {
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    priority: number;
  }> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  
  // Gemini Free Tier is 15 Requests Per Minute (RPM).
  // 60 seconds / 15 = 4 seconds per request.
  // We set it to 5500ms to be extremely safe (approx 11 RPM) and account for bursts.
  private minDelay = 5500; 

  constructor() {
    // Recover last request time from storage to prevent burst on reload
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_REQUEST);
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!isNaN(ts)) {
          this.lastRequestTime = ts;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  add<T>(task: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, priority });
      // Higher priority processes first
      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Enforce rate limit delay
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      
      if (timeSinceLast < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLast;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        this.updateLastRequestTime();
        // Execute the task
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private updateLastRequestTime() {
    this.lastRequestTime = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_REQUEST, this.lastRequestTime.toString());
    } catch (e) { /* ignore */ }
  }
}

// Singleton queue instance
const apiQueue = new RequestQueue();


/**
 * Helper to retry async functions with exponential backoff
 * Wraps the API call itself for network robustness
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      // Identify rate limit errors
      const status = error?.status || error?.response?.status || error?.code || error?.error?.code;
      const message = error?.message || error?.error?.message || JSON.stringify(error);
      
      const isRateLimit = 
        status === 429 || 
        status === 'RESOURCE_EXHAUSTED' ||
        (typeof message === 'string' && (
          message.includes('429') || 
          message.includes('quota') || 
          message.includes('RESOURCE_EXHAUSTED')
        ));

      if (isRateLimit) {
        if (attempt <= retries) {
          // Exponential backoff: 2s, 4s, 8s... + random jitter
          const jitter = Math.random() * 1000;
          const delay = (initialDelay * Math.pow(2, attempt - 1)) + jitter;
          
          console.warn(`Gemini Rate Limit (Attempt ${attempt}/${retries}). Waiting ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error("Gemini traffic is high. Please wait a moment and try again.");
        }
      }
      
      // For non-rate-limit errors, rethrow immediately
      throw error;
    }
  }
}

export async function analyzeImage(base64Image: string, mimeType: string): Promise<SensoryMoment> {
  // Priority 10: High priority for user-initiated main action
  return apiQueue.add(() => retryWithBackoff(async () => {
    try {
      const model = "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model: model,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
        },
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
              {
                text: "Reveal the Mono no aware in this image for a collector of moments.",
              },
            ],
          },
        ],
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Gemini.");
      }

      const data = JSON.parse(text) as SensoryMoment;
      return data;
    } catch (error) {
      console.error("Gemini Analysis Failed:", error);
      throw error;
    }
  }, 3, 5000), 10);
}

export async function analyzeWord(word: string, context: string): Promise<WordAnalysis> {
  // Priority 1: Lower priority for background dictionary tasks
  return apiQueue.add(() => retryWithBackoff(async () => {
    try {
      const prompt = `
      You are a literary dictionary for a collector interested in "Mono no aware" (the pathos of things).
      
      Define the word "${word}". 
      Do not give a standard dictionary definition. 
      Define it by its sensory weight, its relationship to time, loss, or beauty, specifically within the context of: "${context}".
      
      **Language Requirement**: Output the definition and nuance in **Chinese (Simplified)**.
      
      Keep it brief, aesthetic, and profound. Use simple but evocative language suitable for the word's origin.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: WORD_ANALYSIS_SCHEMA,
          temperature: 0.8,
        },
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response.text;
      if(!text) throw new Error("No analysis generated");
      
      return JSON.parse(text) as WordAnalysis;

    } catch (error) {
      console.error("Word Analysis Failed:", error);
      // Graceful fallback for secondary features so they don't block the queue forever
      return {
        definition: "时间的碎片，封存于文字之中。",
        nuance: "意义如阴影般变幻。"
      };
    }
  }, 2, 6000), 1); 
}

export async function generateCollageFragments(inputText: string, settings: GenerationSettings, isRemix: boolean = false): Promise<CollageFragment[]> {
  // Priority 8: Medium-High priority
  return apiQueue.add(() => retryWithBackoff(async () => {
    try {
      const prompt = `
      You are a Collage Poet.
      Task: Create a set of visual text fragments based on the user's input.
      
      Input Context: "${inputText}"
      
      **Configuration**:
      - **Target Quantity**: Approx ${settings.quantity} fragments
      - **Style Preference**: ${settings.stylePreference}
      
      Requirements:
      1. **Language Consistency**: Detect the language of the 'Input Context'. 
         - If the input is in English, generate fragments in English.
         - If the input is in Chinese (or ambiguous), generate fragments in **Chinese**.
      2. Deconstruct the input text into key words.
      3. GENERATE many related words (synonyms, atmospheric words, emotions, nature imagery).
      ${isRemix ? `
      4. **SEMANTIC COLLISION (REMIX)**: Ensure the output includes pairs of distinct words that create strong, poetic contrast.
      5. Focus on unexpected, surreal, or oxymoronic combinations.
      ` : `
      4. Include synonyms, atmospheric words, and emotions.
      5. Use sophisticated, literary, or obscure poetic words.
      `}
      6. Assign varied visual styles (newspaper, typewriter, handwritten, magazine-cutout, label, minimal, bold-stamp, receipt, prescription, warning). ${settings.stylePreference !== 'mixed' ? `Prioritize '${settings.stylePreference}' style.` : ''}
      7. Randomize rotation slightly.
      
      The goal is to provide rich raw material for a "cut-up" style poem.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: COLLAGE_SCHEMA,
          temperature: isRemix ? 0.9 : 0.8, // Higher temperature for remix
          // Increase token limit for larger quantities
          maxOutputTokens: 2000,
        },
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      const fragments = JSON.parse(text) as Omit<CollageFragment, 'id' | 'x' | 'y'>[];
      
      // Determine Palette based on settings
      const palette = PALETTES[settings.colorTheme || 'random'];

      // Hydrate with client-side IDs, initial positions, AND RANDOMIZED VISUALS
      return fragments.map((f) => {
        // Randomly override defaults
        // If specific style is minimal or label, we might want less random colors, but let's allow the theme to dictate
        const useRandomFont = Math.random() > 0.3;
        const useRandomColor = Math.random() > 0.3;
        const useRandomBg = Math.random() > 0.5; // Allow backgrounds more often if theme is applied

        // Pick color from current theme palette
        const randomTextColor = palette.text[Math.floor(Math.random() * palette.text.length)];
        const randomBgColor = palette.bg[Math.floor(Math.random() * palette.bg.length)];

        return {
          ...f,
          id: `FRAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: (Math.random() * 300) - 150, // Initial Scatter (will be recentered in workbench)
          y: (Math.random() * 300) - 150,
          // Inject random visual properties to ensure variety
          fontFamily: useRandomFont ? RANDOM_FONTS[Math.floor(Math.random() * RANDOM_FONTS.length)] : undefined,
          color: useRandomColor ? randomTextColor : undefined,
          backgroundColor: useRandomBg ? randomBgColor : undefined,
          fontWeight: Math.random() > 0.8 ? 'bold' : 'normal',
        };
      });

    } catch (error) {
       console.error("Collage Generation Failed:", error);
       throw error;
    }
  }, 2, 5000), 8);
}
