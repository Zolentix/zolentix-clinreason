import { askGemini, extractJSON } from './gemini';
import type { PatientCase, DifferentialItem, MedSafetyItem, Interaction } from '../types';

const SYSTEM_PROMPT = `You are a medication-safety reasoning assistant supporting a clinician. Given a patient's medication list, their suspected conditions, and patient factors (age, sex, pregnancy, renal/hepatic risk, allergies), identify: dangerous drug interactions, contraindications given the suspected conditions, dose concerns, and therapeutic duplications. For each, name the drugs, the severity (severe|moderate|mild), explain the MECHANISM and the clinical effect in one or two clear sentences, and give a concrete recommendation. Cite the class of evidence/source at a general level; never fabricate specific figures. Output STRICT JSON matching MedSafetyItem[]. Be conservative and clear. You support, never replace, the prescriber.`;

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function checkDrugDrug(meds: { name: string }[], interactions: Interaction[]): MedSafetyItem[] {
  const items: MedSafetyItem[] = [];
  const medNames = meds.map((m) => normalise(m.name));

  for (const interaction of interactions) {
    const aMatch = medNames.some(
      (m) => m.includes(normalise(interaction.drugA)) || normalise(interaction.drugA).includes(m)
    );
    const bMatch = medNames.some(
      (m) => m.includes(normalise(interaction.drugB)) || normalise(interaction.drugB).includes(m)
    );

    if (aMatch && bMatch) {
      items.push({
        kind: 'interaction',
        drugs: [interaction.drugA, interaction.drugB],
        severity: interaction.severity,
        explanation: `${interaction.mechanism}. ${interaction.effect}`,
        recommendation: interaction.management,
        citations: [{ source: 'BNF / drug interaction database', note: `${interaction.drugA}-${interaction.drugB} interaction` }],
      });
    }
  }

  return items;
}

async function checkConditionContraindications(
  patientCase: PatientCase,
  differential: DifferentialItem[]
): Promise<MedSafetyItem[]> {
  if (patientCase.medications.length === 0) return [];

  try {
    const text = await askGemini(
      SYSTEM_PROMPT,
      `Patient medications: ${JSON.stringify(patientCase.medications)}
Patient age: ${patientCase.age ?? 'unknown'}, sex: ${patientCase.sex ?? 'unknown'}
Allergies: ${JSON.stringify(patientCase.allergies)}
Risk factors: ${JSON.stringify(patientCase.riskFactors)}
History: ${JSON.stringify(patientCase.history)}

Top suspected conditions from differential:
${differential.slice(0, 4).map((d) => `- ${d.condition} (confidence: ${d.confidence})`).join('\n')}

Identify contraindications given the suspected conditions, patient-factor dosing concerns, and therapeutic duplications. Do NOT include drug-drug interactions (those are handled separately).
Output ONLY a JSON array of MedSafetyItem: [{"kind": "contraindication"|"dosing"|"duplication", "drugs": ["string"], "severity": "severe"|"moderate"|"mild", "explanation": "string", "recommendation": "string", "citations": [{"source": "string", "note": "string"}]}]
If nothing found, output [].`
    );

    const cleaned = extractJSON(text);
    return JSON.parse(cleaned) as MedSafetyItem[];
  } catch (err) {
    console.error('Condition contraindication check failed:', err);
    return [];
  }
}

export async function checkMedSafety(
  patientCase: PatientCase,
  differential: DifferentialItem[],
  interactions: Interaction[]
): Promise<MedSafetyItem[]> {
  const [drugDrug, conditionItems] = await Promise.all([
    Promise.resolve(checkDrugDrug(patientCase.medications, interactions)),
    checkConditionContraindications(patientCase, differential),
  ]);

  const all = [...drugDrug, ...conditionItems];
  const severityOrder = { severe: 0, moderate: 1, mild: 2 };
  return all.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
