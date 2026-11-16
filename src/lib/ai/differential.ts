import type { PatientCase, DifferentialItem, Condition } from '../types';

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function caseContains(pc: PatientCase, feature: string): boolean {
  const norm = normalise(feature);
  const haystack = normalise(
    [
      pc.rawText, pc.presentingComplaint,
      ...pc.symptoms.map(s => s.name),
      ...pc.history, ...pc.riskFactors,
      pc.vitals ? `bp ${pc.vitals.bp} hr ${pc.vitals.hr} temp ${pc.vitals.temp} spo2 ${pc.vitals.spo2} rr ${pc.vitals.rr}` : '',
    ].join(' ')
  );
  return haystack.includes(norm);
}

const NEXT_STEPS: Record<string, string> = {
  cardiac: '12-lead ECG and serial troponin levels',
  respiratory: 'Chest X-ray and arterial blood gas',
  neuro: 'CT head and full neurological examination',
  GI: 'Bloods (FBC, U&E, LFTs, amylase), abdominal imaging',
  infectious: 'Blood cultures, FBC, CRP/PCT, lactate',
  endocrine: 'Blood glucose, U&E, thyroid function tests',
};

const GUIDELINES: Record<string, { source: string; note: string }> = {
  cardiac: { source: 'ESC Guidelines', note: 'European Society of Cardiology clinical practice guidelines' },
  respiratory: { source: 'BTS Guidelines', note: 'British Thoracic Society clinical guidelines' },
  neuro: { source: 'NICE Guidelines', note: 'National Institute for Health and Care Excellence guidance' },
  GI: { source: 'BSG Guidelines', note: 'British Society of Gastroenterology clinical guidelines' },
  infectious: { source: 'NICE / Sepsis Trust', note: 'UK Sepsis Trust and NICE clinical guidelines' },
  endocrine: { source: 'Endocrine Society', note: 'Endocrine Society clinical practice guidelines' },
};

export function generateDifferential(patientCase: PatientCase, conditions: Condition[]): DifferentialItem[] {
  const scored: { c: Condition; score: number; sup: string[]; opp: string[] }[] = [];

  for (const c of conditions) {
    const sup: string[] = [];
    let score = 0;

    for (const f of c.typicalFeatures) {
      if (caseContains(patientCase, f)) { sup.push(f); score += 2; }
    }
    for (const rf of c.riskFactors) {
      if (caseContains(patientCase, rf)) { sup.push(`Risk factor: ${rf}`); score += 1; }
    }
    for (const rff of c.redFlagFeatures) {
      if (caseContains(patientCase, rff)) score += 1.5;
    }

    const opp = c.typicalFeatures
      .filter(f => !caseContains(patientCase, f))
      .slice(0, 3)
      .map(f => `${f} not reported`);

    if (score > 0) scored.push({ c, score, sup, opp });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 6);
  const maxScore = top[0]?.score ?? 1;

  return top.map(item => {
    const raw = item.score / maxScore;
    const confidence = Math.round(Math.min(0.92, Math.max(0.08, raw * 0.85)) * 100) / 100;
    const matched = item.sup.filter(s => !s.startsWith('Risk factor')).length;
    const total = item.c.typicalFeatures.length;
    const age = patientCase.age ? `${patientCase.age}-year-old` : 'Patient';
    const sex = patientCase.sex && patientCase.sex !== 'unknown' ? ` ${patientCase.sex}` : '';
    const rfs = item.sup.filter(s => s.startsWith('Risk factor')).map(s => s.replace('Risk factor: ', ''));

    let rationale = `${age}${sex} presenting with ${matched} of ${total} typical features of ${item.c.name}`;
    if (rfs.length > 0) rationale += `. Relevant risk factors: ${rfs.join(', ')}`;
    if (item.opp.length > 0) rationale += `. However, ${item.opp[0].toLowerCase()}`;
    rationale += '. Clinical correlation recommended.';

    return {
      condition: item.c.name,
      icd10: item.c.icd10,
      confidence,
      supporting: item.sup.slice(0, 5),
      opposing: item.opp,
      rationale,
      nextStep: NEXT_STEPS[item.c.system] ?? 'Targeted investigation based on clinical presentation',
      citations: [GUIDELINES[item.c.system] ?? { source: 'Clinical guidelines', note: 'Standard clinical practice' }],
    };
  });
}
