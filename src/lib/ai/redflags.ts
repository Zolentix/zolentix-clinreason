import type { PatientCase, RedFlag, RedFlagRule } from '../types';

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function caseContains(patientCase: PatientCase, feature: string): boolean {
  const norm = normalise(feature);
  const haystack = normalise(
    [
      patientCase.rawText,
      patientCase.presentingComplaint,
      ...patientCase.symptoms.map(s => `${s.name} ${s.severity ?? ''} ${s.duration ?? ''}`),
      ...patientCase.history,
      ...patientCase.riskFactors,
      patientCase.vitals ? `bp ${patientCase.vitals.bp} hr ${patientCase.vitals.hr} temp ${patientCase.vitals.temp} spo2 ${patientCase.vitals.spo2} rr ${patientCase.vitals.rr}` : '',
    ].join(' ')
  );
  return haystack.includes(norm);
}

export function screenRedFlags(patientCase: PatientCase, rules: RedFlagRule[]): RedFlag[] {
  const flags: RedFlag[] = [];

  for (const rule of rules) {
    const allRequired = rule.requiredFeatures.every(f => caseContains(patientCase, f));
    if (!allRequired) continue;

    const anyOf = rule.anyOfFeatures.length === 0 || rule.anyOfFeatures.some(f => caseContains(patientCase, f));
    if (!anyOf) continue;

    const triggered = [
      ...rule.requiredFeatures.filter(f => caseContains(patientCase, f)),
      ...rule.anyOfFeatures.filter(f => caseContains(patientCase, f)),
    ];

    flags.push({
      pattern: rule.pattern,
      why: `Features detected: ${triggered.join(', ')}`,
      action: rule.action,
      severity: rule.severity,
    });
  }

  return flags.sort((a, b) => {
    if (a.severity === 'emergency' && b.severity !== 'emergency') return -1;
    if (b.severity === 'emergency' && a.severity !== 'emergency') return 1;
    return 0;
  });
}
