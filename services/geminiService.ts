
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SensoryMoment, WordAnalysis } from "../types";

// Initialize the Gemini client
// The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are not an AI assistant. You are a digital aesthete deeply influenced by Heian-era literature, capable of perceiving "Mono no aware" (物哀) — the pathos of things, a sensitivity to ephemera.

Your task is to observe the user's image and translate the visual surface into a multi-dimensional sensory moment.
Look for signs of time: rust, fading, weather, solitude, incompleteness.

Your output must be a JSON object.

Guidelines:
1. **Haiku/Tanka**: Compose a Japanese poem capturing the essence. Provide the reading and an **English** translation.
2. **Sensory Expansion**:
   - **Auditory**: What subtle sound exists in this frozen moment? Describe it in **English**. (e.g., The distant hum of cicadas, the soft settle of dust).
   - **Tactile**: Is the air humid, cold, sticky? Is the surface rough? Describe it in **English**.
   - **Olfactory**: What does this scene smell like? Describe it in **English**. (e.g., The musty scent of old books, petrichor).
3. **Insight**: A bittersweet philosophical reflection on why this moment matters. Write it in **English**.

Tone: Poetic, restrained, melancholic but beautiful. Avoid melodrama.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    haiku: {
      type: Type.OBJECT,
      properties: {
        japanese: { type: Type.STRING, description: "The poem in Japanese Kanji/Kana" },
        reading: { type: Type.STRING, description: "Hiragana or Romaji reading" },
        translation: { type: Type.STRING, description: "English translation of the poem" },
      },
      required: ["japanese", "reading", "translation"],
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
    definition: { type: Type.STRING, description: "A poetic definition of the word, relating to time or emotion." },
    nuance: { type: Type.STRING, description: "The sensory or cultural weight of this word." },
  },
  required: ["definition", "nuance"],
};

/**
 * Rate Limited Queue
 * Ensures we don't exceed the Free Tier's RPM (Requests Per Minute) limits
 * by serializing requests and adding a minimum delay.
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
  
  // Gemini Free Tier is often 15 Requests Per Minute (RPM).
  // 60 seconds / 15 = 4 seconds per request.
  // We set it to 4500ms to be safe and account for network latency overlap.
  private minDelay = 4500; 

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
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLast));
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        this.lastRequestTime = Date.now();
        // Execute the task
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }
}

// Singleton queue instance
const apiQueue = new RequestQueue();


/**
 * Helper to retry async functions with exponential backoff
 * Wraps the API call itself for network robustness
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, initialDelay = 5000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      // Identify rate limit errors
      // Gemini often returns { error: { code: 429, message: "..." } }
      // Or simple HTTP 429
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
          // Exponential backoff: 5s, 10s, 20s, 40s... + random jitter
          const jitter = Math.random() * 1000;
          const delay = (initialDelay * Math.pow(2, attempt - 1)) + jitter;
          
          console.warn(`Gemini Rate Limit (Attempt ${attempt}/${retries}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error("Daily quota reached. Please try again later.");
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
                text: "Reveal the Mono no aware in this image.",
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
  }), 10);
}

export async function analyzeWord(word: string, context: string): Promise<WordAnalysis> {
  // Priority 1: Lower priority for background dictionary tasks
  return apiQueue.add(() => retryWithBackoff(async () => {
    try {
      const prompt = `
      You are a poet curating a dictionary of "Mono no aware" (the pathos of things).
      
      Define the word "${word}". 
      Do not give a standard dictionary definition. 
      Define it by its sensory weight, its relationship to time, loss, or beauty, specifically within the context of: "${context}".
      
      Keep it brief, aesthetic, and profound.
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
  }, 3, 5000), 1); 
}
