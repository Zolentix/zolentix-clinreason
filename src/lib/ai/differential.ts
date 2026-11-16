import { askGemini, extractJSON } from './gemini';
import type { PatientCase, DifferentialItem, Condition } from '../types';

const SYSTEM_PROMPT = `You are a clinical reasoning engine that produces a structured differential diagnosis to support (never replace) a qualified clinician. You reason carefully, weigh evidence on both sides, and never overstate certainty.

Given a structured patient case and a list of candidate conditions, you will:
1. Consider which conditions the presentation fits, AND which cannot-miss serious conditions must be actively excluded even if less likely.
2. For each plausible condition, list the features that SUPPORT it and the features that ARGUE AGAINST it from THIS patient's case. Be specific - cite the patient's own symptoms, vitals, history.
3. Assign a calibrated confidence 0-1. Do not inflate. If the case is ambiguous, reflect that with moderate confidences that sum sensibly.
4. Give one concrete next step (a test or exam) that would most change your ranking - the highest-information action.
5. Attach guideline-style citations by naming the relevant guideline/body (e.g. "ESC 2023 ACS guideline", "NICE CG95") and a one-line note. Do not fabricate specific numbers or quotes; cite the source at the guideline level.

Hard rules:
- Output STRICT JSON only, matching the DifferentialItem[] schema provided.
- Never output a single diagnosis as if certain. Always a ranked differential.
- If a red-flag emergency pattern is present, still produce the differential, but your rationale must note the urgency.
- Reason in the clinical content; the final wording will be translated later, so write clearly and plainly in English here.
- You are decision SUPPORT. Your output will be reviewed by a clinician.`;

export async function generateDifferential(
  patientCase: PatientCase,
  conditions: Condition[]
): Promise<DifferentialItem[]> {
  const schema = `[{
    "condition": "string",
    "icd10": "string",
    "confidence": 0.0-1.0,
    "supporting": ["string"],
    "opposing": ["string"],
    "rationale": "string (plain-language reasoning)",
    "nextStep": "string (highest-information investigation)",
    "citations": [{"source": "string", "note": "string"}]
  }]`;

  try {
    const text = await askGemini(
      SYSTEM_PROMPT,
      `Patient case:\n${JSON.stringify(patientCase, null, 2)}\n\nCandidate conditions from knowledge base:\n${JSON.stringify(conditions.map(c => ({ name: c.name, icd10: c.icd10, typicalFeatures: c.typicalFeatures, riskFactors: c.riskFactors })), null, 2)}\n\nProduce a ranked differential (top 6) as JSON matching this schema:\n${schema}\n\nOutput ONLY the JSON array, no markdown fences.`
    );

    const cleaned = extractJSON(text);
    const items = JSON.parse(cleaned) as DifferentialItem[];
    return items.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  } catch (err) {
    console.error('Differential generation failed:', err);
    return [];
  }
}
