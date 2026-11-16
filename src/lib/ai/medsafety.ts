import type { PatientCase, DifferentialItem, MedSafetyItem, Interaction } from '../types';

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function checkDrugDrug(meds: { name: string }[], interactions: Interaction[]): MedSafetyItem[] {
  const items: MedSafetyItem[] = [];
  const medNames = meds.map(m => normalise(m.name));

  for (const ix of interactions) {
    const aMatch = medNames.some(m => m.includes(normalise(ix.drugA)) || normalise(ix.drugA).includes(m));
    const bMatch = medNames.some(m => m.includes(normalise(ix.drugB)) || normalise(ix.drugB).includes(m));

    if (aMatch && bMatch) {
      items.push({
        kind: 'interaction',
        drugs: [ix.drugA, ix.drugB],
        severity: ix.severity,
        explanation: `${ix.mechanism}. ${ix.effect}`,
        recommendation: ix.management,
        citations: [{ source: 'BNF / drug interaction database', note: `${ix.drugA}–${ix.drugB} interaction` }],
      });
    }
  }
  return items;
}

function checkAllergies(pc: PatientCase): MedSafetyItem[] {
  const items: MedSafetyItem[] = [];
  if (!pc.allergies.length || !pc.medications.length) return items;

  for (const allergy of pc.allergies) {
    const na = normalise(allergy);
    for (const med of pc.medications) {
      if (normalise(med.name).includes(na) || na.includes(normalise(med.name))) {
        items.push({
          kind: 'contraindication', drugs: [med.name], severity: 'severe',
          explanation: `Patient reports allergy to ${allergy}. ${med.name} may trigger an allergic reaction.`,
          recommendation: 'Verify allergy history. Consider alternative medication.',
          citations: [{ source: 'BNF', note: 'Allergy cross-reactivity' }],
        });
      }
    }
  }

  const hasPen = pc.allergies.some(a => /penicillin/i.test(a));
  if (hasPen) {
    for (const m of pc.medications) {
      if (/ceph|cefal/i.test(m.name)) {
        items.push({
          kind: 'contraindication', drugs: [m.name], severity: 'moderate',
          explanation: 'Patient has penicillin allergy. Cephalosporins have ~1-2% cross-reactivity.',
          recommendation: 'Consider non-beta-lactam alternative. If essential, use with caution.',
          citations: [{ source: 'BNF', note: 'Penicillin–cephalosporin cross-reactivity' }],
        });
      }
    }
  }
  return items;
}

function checkConditionContraindications(pc: PatientCase, differential: DifferentialItem[]): MedSafetyItem[] {
  const items: MedSafetyItem[] = [];
  const meds = pc.medications.map(m => normalise(m.name));
  const raw = normalise(pc.rawText);
  const conds = differential.map(d => normalise(d.condition));

  const hasNSAID = meds.some(m => ['ibuprofen', 'diclofenac', 'naproxen', 'nsaid'].some(n => m.includes(n)));
  const hasRenal = raw.includes('renal') || raw.includes('kidney') || conds.some(c => c.includes('kidney'));
  if (hasNSAID && hasRenal) {
    items.push({
      kind: 'contraindication', drugs: ['NSAID'], severity: 'severe',
      explanation: 'NSAIDs reduce renal prostaglandin synthesis and can worsen renal function.',
      recommendation: 'Avoid NSAIDs in renal impairment. Use paracetamol for analgesia.',
      citations: [{ source: 'BNF / NICE', note: 'NSAIDs in renal impairment' }],
    });
  }

  const hasBB = meds.some(m => ['propranolol', 'atenolol', 'bisoprolol', 'metoprolol', 'carvedilol'].some(n => m.includes(n)));
  const hasAsthma = raw.includes('asthma') || conds.some(c => c.includes('asthma'));
  if (hasBB && hasAsthma) {
    items.push({
      kind: 'contraindication', drugs: ['Beta-blocker'], severity: 'moderate',
      explanation: 'Beta-blockers may trigger bronchospasm in asthma patients.',
      recommendation: 'Use cardioselective beta-blocker if essential. Monitor respiratory function.',
      citations: [{ source: 'BNF', note: 'Beta-blockers and asthma' }],
    });
  }

  const hasMet = meds.some(m => m.includes('metformin'));
  const hasAKI = conds.some(c => c.includes('kidney injury') || c.includes('sepsis'));
  if (hasMet && hasAKI) {
    items.push({
      kind: 'dosing', drugs: ['Metformin'], severity: 'moderate',
      explanation: 'Metformin accumulates in renal failure, increasing lactic acidosis risk.',
      recommendation: 'Withhold metformin if AKI suspected. Monitor renal function.',
      citations: [{ source: 'BNF', note: 'Metformin and renal function' }],
    });
  }

  return items;
}

export function checkMedSafety(
  patientCase: PatientCase,
  differential: DifferentialItem[],
  interactions: Interaction[]
): MedSafetyItem[] {
  const all = [
    ...checkDrugDrug(patientCase.medications, interactions),
    ...checkAllergies(patientCase),
    ...checkConditionContraindications(patientCase, differential),
  ];
  const order = { severe: 0, moderate: 1, mild: 2 };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}
