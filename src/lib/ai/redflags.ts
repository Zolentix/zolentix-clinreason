import { askGemini, extractJSON } from './gemini';
import type { PatientCase, RedFlag, RedFlagRule } from '../types';

const LLM_SYSTEM_PROMPT = `You are a clinical triage safety net. Given a structured patient case, identify any patterns that could represent a medical EMERGENCY or URGENT situation that must not be missed (e.g. acute coronary syndrome, stroke, sepsis, meningitis, pulmonary embolism, ectopic pregnancy, anaphylaxis, DKA, acute abdomen).
For each, state the pattern, which of THIS patient's features triggered it, the severity (emergency|urgent), and the immediate action. Be conservative: when in doubt, flag it. Output STRICT JSON matching RedFlag[]. If you see no emergency/urgent pattern, output []. You are a safety net supporting a clinician.`;

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function caseContains(patientCase: PatientCase, feature: string): boolean {
  const norm = normalise(feature);
  const haystack = normalise(
    [
      patientCase.rawText,
      patientCase.presentingComplaint,
      ...patientCase.symptoms.map((s) => `${s.name} ${s.severity ?? ''} ${s.duration ?? ''}`),
      ...patientCase.history,
      ...patientCase.riskFactors,
      patientCase.vitals ? `bp ${patientCase.vitals.bp} hr ${patientCase.vitals.hr} temp ${patientCase.vitals.temp} spo2 ${patientCase.vitals.spo2} rr ${patientCase.vitals.rr}` : '',
    ].join(' ')
  );
  return haystack.includes(norm);
}

function runDeterministicRules(patientCase: PatientCase, rules: RedFlagRule[]): RedFlag[] {
  const flags: RedFlag[] = [];

  for (const rule of rules) {
    const allRequired = rule.requiredFeatures.every((f) => caseContains(patientCase, f));
    if (!allRequired) continue;

    const anyOf = rule.anyOfFeatures.length === 0 || rule.anyOfFeatures.some((f) => caseContains(patientCase, f));
    if (!anyOf) continue;

    const triggered = [
      ...rule.requiredFeatures.filter((f) => caseContains(patientCase, f)),
      ...rule.anyOfFeatures.filter((f) => caseContains(patientCase, f)),
    ];

    flags.push({
      pattern: rule.pattern,
      why: `Features detected: ${triggered.join(', ')}`,
      action: rule.action,
      severity: rule.severity,
    });
  }

  return flags;
}

async function runLlmSafetyNet(patientCase: PatientCase): Promise<RedFlag[]> {
  try {
    const text = await askGemini(
      LLM_SYSTEM_PROMPT,
      `Patient case:\n${JSON.stringify(patientCase, null, 2)}\n\nOutput ONLY a JSON array of RedFlag objects: [{"pattern": "string", "why": "string", "action": "string", "severity": "emergency"|"urgent"}]\nIf no red flags, output [].`
    );

    const cleaned = extractJSON(text);
    return JSON.parse(cleaned) as RedFlag[];
  } catch (err) {
    console.error('LLM safety net failed, relying on deterministic rules:', err);
    return [];
  }
}

export async function screenRedFlags(
  patientCase: PatientCase,
  rules: RedFlagRule[]
): Promise<RedFlag[]> {
  const [ruleFlags, llmFlags] = await Promise.all([
    Promise.resolve(runDeterministicRules(patientCase, rules)),
    runLlmSafetyNet(patientCase),
  ]);

  const seen = new Set<string>();
  const merged: RedFlag[] = [];

  for (const flag of [...ruleFlags, ...llmFlags]) {
    const key = normalise(flag.pattern);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(flag);
  }

  return merged.sort((a, b) => {
    if (a.severity === 'emergency' && b.severity !== 'emergency') return -1;
    if (b.severity === 'emergency' && a.severity !== 'emergency') return 1;
    return 0;
  });
}
