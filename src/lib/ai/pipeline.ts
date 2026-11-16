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

export async function runClinReason(
  caseText: string,
  selectedLang: Lang | 'auto',
  onStage?: (stage: PipelineStage) => void
): Promise<ClinReport> {
  const conditions = conditionsData as Condition[];
  const rules = redflagsData as RedFlagRule[];
  const interactions = interactionsData as Interaction[];

  onStage?.('intake');
  const patientCase = await parseIntake(caseText, selectedLang);

  onStage?.('redflags');
  const redFlags = await screenRedFlags(patientCase, rules);

  onStage?.('differential');
  const differential = await generateDifferential(patientCase, conditions);

  onStage?.('medsafety');
  const medSafety = await checkMedSafety(patientCase, differential, interactions);

  const report: ClinReport = {
    case: patientCase,
    redFlags,
    differential,
    medSafety,
    overallNote:
      'This is a clinical decision-support analysis, not a diagnosis. All findings require review and confirmation by a qualified clinician. The knowledge base is a demo set and is not exhaustive. Confidence scores reflect relative likelihood given the information provided and should not be interpreted as diagnostic certainty.',
    lang: patientCase.lang,
  };

  if (patientCase.lang !== 'en') {
    onStage?.('localise');
    const localised = await localiseReport(report, patientCase.lang);
    onStage?.('done');
    return localised;
  }

  onStage?.('done');
  return report;
}
