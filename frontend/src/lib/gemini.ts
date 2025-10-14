import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_VISION_MODEL = 'gemini-2.5-flash';

let geminiClient: GoogleGenerativeAI | null = null;

function getClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export function getTextModel(model: string = GEMINI_TEXT_MODEL) {
  return getClient().getGenerativeModel({ model });
}

export function getVisionModel(model: string = GEMINI_VISION_MODEL) {
  return getClient().getGenerativeModel({ model });
}

type GenerativeModel = ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

export async function generateText(
  model: GenerativeModel,
  prompt: string,
  temperature: number = 0.2
) {
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
    },
  });

  return result.response?.text?.() ?? '';
}
