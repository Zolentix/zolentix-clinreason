import type { ClinReport, Lang, Condition, RedFlagRule, Interaction } from '../types';
import { parseIntake } from './intake';
import { screenRedFlags } from './redflags';
import { generateDifferential } from './differential';
import { checkMedSafety } from './medsafety';
import { localiseReport } from './localise';
import conditionsData from '../knowledge/conditions.json';
import redflagsData from '../knowledge/redflags.json';
import interactionsData from '../knowledge/interactions.json';

export type PipelineStage = 'intake' | 'redflags' | 'differential' | 'medsafety' | 'localise' | 'done';

export function runClinReason(
  caseText: string,
  selectedLang: Lang | 'auto',
): ClinReport {
  const conditions = conditionsData as Condition[];
  const rules = redflagsData as RedFlagRule[];
  const interactions = interactionsData as Interaction[];

  const patientCase = parseIntake(caseText, selectedLang);
  const redFlags = screenRedFlags(patientCase, rules);
  const differential = generateDifferential(patientCase, conditions);
  const medSafety = checkMedSafety(patientCase, differential, interactions);

  const report: ClinReport = {
    case: patientCase,
    redFlags,
    differential,
    medSafety,
    overallNote: 'This is a clinical decision-support analysis, not a diagnosis. All findings require review and confirmation by a qualified clinician. The knowledge base is a demo set and is not exhaustive. Confidence scores reflect relative likelihood given the information provided and should not be interpreted as diagnostic certainty.',
    lang: patientCase.lang,
  };

  if (patientCase.lang !== 'en') {
    return localiseReport(report, patientCase.lang);
  }

  return report;
}
