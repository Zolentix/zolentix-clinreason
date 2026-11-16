import { askGemini, extractJSON } from './gemini';
import type { PatientCase, Lang } from '../types';
import { detectLang } from '../i18n/strings';

const SYSTEM_PROMPT = `You are a clinical intake parser. Given a free-text clinical case description, extract the structured patient information into the exact JSON schema provided. Be thorough: extract every symptom, medication, vital sign, risk factor, and historical detail mentioned. If information is not stated, omit the field or use an empty array. Detect the input language (en, fr, or it). Output STRICT JSON only, matching the PatientCase schema.`;

export async function parseIntake(
  rawText: string,
  selectedLang: Lang | 'auto'
): Promise<PatientCase> {
  const lang = selectedLang === 'auto' ? detectLang(rawText) : selectedLang;

  const schema = `{
    "rawText": "string (the original text)",
    "lang": "en|fr|it",
    "age": "number or omit",
    "sex": "male|female|other|unknown",
    "presentingComplaint": "string (main complaint in English)",
    "symptoms": [{"name": "string", "duration": "string or omit", "severity": "string or omit"}],
    "vitals": {"bp": "string or omit", "hr": "number or omit", "temp": "number or omit", "spo2": "number or omit", "rr": "number or omit"} or omit,
    "history": ["string"],
    "medications": [{"name": "string", "dose": "string or omit", "freq": "string or omit"}],
    "allergies": ["string"],
    "riskFactors": ["string"]
  }`;

  try {
    const text = await askGemini(
      SYSTEM_PROMPT,
      `Parse this clinical case into structured JSON matching this schema:\n${schema}\n\nCase text:\n${rawText}\n\nDetected language: ${lang}\n\nOutput ONLY the JSON object, no markdown fences.`
    );

    const cleaned = extractJSON(text);
    const parsed = JSON.parse(cleaned) as PatientCase;
    parsed.rawText = rawText;
    parsed.lang = lang;
    return parsed;
  } catch (err) {
    console.error('Intake parsing failed, using fallback:', err);
    return {
      rawText,
      lang,
      presentingComplaint: rawText.slice(0, 200),
      symptoms: [],
      history: [],
      medications: [],
      allergies: [],
      riskFactors: [],
    };
  }
}
