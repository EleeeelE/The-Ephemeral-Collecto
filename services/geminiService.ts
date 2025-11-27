
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SensoryMoment, WordAnalysis, CollageFragment, GenerationSettings } from "../types";

// Initialize the Gemini client
// The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are not an AI assistant. You are a digital poet observing the world through the lens of "Mono no aware" (物哀) — the pathos of things, a sensitivity to ephemera and the passage of time.

Your task is to observe the user's image and translate the visual surface into a multi-dimensional sensory moment, designed for a user who wants to **learn advanced, poetic English vocabulary**.

Look for signs of time: rust, fading, weather, solitude, incompleteness.

Your output must be a JSON object.

Guidelines:
1. **The Essence (Poetry)**: Compose a short, free-verse poem or Haiku in **English**. It should be evocative and use sophisticated vocabulary suitable for learning. Provide a **Chinese** translation.
2. **Sensory Expansion**:
   - **Auditory**: What subtle sound exists in this frozen moment? Describe it in **English**. (e.g., "The rhythmic patter of rain," "The distant, hollow hum of traffic").
   - **Tactile**: Is the air humid, cold, sticky? Is the surface rough? Describe it in **English**.
   - **Olfactory**: What does this scene smell like? Describe it in **English**. (e.g., "The sharp tang of rust," "The musty scent of old paper").
3. **Insight**: A bittersweet philosophical reflection on why this moment matters. Write it in **English**.

Tone: Poetic, restrained, melancholic but beautiful.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    haiku: {
      type: Type.OBJECT,
      properties: {
        english: { type: Type.STRING, description: "The poem in English (use rich vocabulary)" },
        chinese: { type: Type.STRING, description: "The Chinese translation of the poem" },
      },
      required: ["english", "chinese"],
    },
    senses: {
      type: Type.OBJECT,
      properties: {
        auditory: { type: Type.STRING, description: "Imagined subtle sounds in English" },
        tactile_temperature: { type: Type.STRING, description: "Imagined touch and air quality in English" },
        olfactory: { type: Type.STRING, description: "Imagined smells in English" },
      },
      required: ["auditory", "tactile_temperature", "olfactory"],
    },
    insight: { type: Type.STRING, description: "Philosophical reflection on time and impermanence in English" },
  },
  required: ["haiku", "senses", "insight"],
};

const WORD_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    definition: { type: Type.STRING, description: "A poetic English definition of the word, relating to time or emotion." },
    nuance: { type: Type.STRING, description: "The sensory weight or origin of this word (in English)." },
  },
  required: ["definition", "nuance"],
};

const COLLAGE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      style: { type: Type.STRING, enum: ['newspaper', 'typewriter', 'handwritten', 'magazine-cutout'] },
      rotation: { type: Type.NUMBER, description: "Random rotation between -15 and 15" },
    },
    required: ["text", "style", "rotation"],
  },
};

const STORAGE_KEY_LAST_REQUEST = 'gemini_last_request_ts';

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
                text: "Reveal the Mono no aware in this image for an English learner.",
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
      You are a literary dictionary for an English learner interested in "Mono no aware" (the pathos of things).
      
      Define the English word "${word}". 
      Do not give a standard dictionary definition. 
      Define it by its sensory weight, its relationship to time, loss, or beauty, specifically within the context of: "${context}".
      
      Keep it brief, aesthetic, and profound. Use simple but evocative English.
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
        definition: "A fragment of time, captured in text.",
        nuance: "The meaning shifts like shadows."
      };
    }
  }, 2, 6000), 1); 
}

export async function generateCollageFragments(inputText: string, settings: GenerationSettings): Promise<CollageFragment[]> {
  // Priority 8: Medium-High priority
  return apiQueue.add(() => retryWithBackoff(async () => {
    try {
      const prompt = `
      You are a Collage Poet and Language Tutor.
      Task: Create a set of visual text fragments based on the user's input.
      
      Input Context: "${inputText}"
      
      **Configuration**:
      - **Vocabulary Difficulty**: ${settings.difficulty}
      - **Target Quantity**: Approx ${settings.quantity} fragments
      - **Style Preference**: ${settings.stylePreference}
      
      Requirements:
      1. Deconstruct the input text into key words.
      2. GENERATE many related words (synonyms, atmospheric words, emotions) matching the "${settings.difficulty}" vocabulary level.
      3. If the difficulty is GRE/IELTS, use sophisticated, academic, or obscure poetic words.
      4. Assign varied visual styles (newspaper, typewriter, handwritten, magazine-cutout). ${settings.stylePreference !== 'mixed' ? `Prioritize '${settings.stylePreference}' style.` : ''}
      5. Randomize rotation slightly.
      
      The goal is to provide rich raw material for a "cut-up" style poem.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: COLLAGE_SCHEMA,
          temperature: 0.8,
          // Increase token limit for larger quantities
          maxOutputTokens: 2000,
        },
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      const fragments = JSON.parse(text) as Omit<CollageFragment, 'id' | 'x' | 'y'>[];
      
      // Hydrate with client-side IDs and initial positions
      // Scatter them wider to account for larger quantity
      return fragments.map((f) => ({
        ...f,
        id: `FRAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: (Math.random() * 300) - 150, // Wider scatter
        y: (Math.random() * 300) - 150,
      }));

    } catch (error) {
       console.error("Collage Generation Failed:", error);
       throw error;
    }
  }, 2, 5000), 8);
}
