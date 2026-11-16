import { GoogleGenerativeAI } from '@google/generative-ai';

let _client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (_client) return _client;
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not set — add it to .env.local');
  _client = new GoogleGenerativeAI(key);
  return _client;
}

const MODEL = 'gemini-2.0-flash';

export async function askGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getGemini();
  const model = client.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.2 },
  });

  const chat = model.startChat({
    history: [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood. I will follow these instructions precisely.' }] }],
  });

  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();
  return text;
}

export function extractJSON(raw: string): string {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return cleaned;
}
