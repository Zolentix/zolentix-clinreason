import type { ClinReport, Lang } from '../types';

const CONDITION_FR: Record<string, string> = {
  'Acute coronary syndrome': 'Syndrome coronarien aigu',
  'Pulmonary embolism': 'Embolie pulmonaire',
  'Aortic dissection': 'Dissection aortique',
  'Tension pneumothorax': 'Pneumothorax sous tension',
  'Pneumonia': 'Pneumonie',
  'Acute heart failure': 'Insuffisance cardiaque aiguë',
  'Atrial fibrillation': 'Fibrillation auriculaire',
  'Stroke (ischaemic)': 'AVC ischémique',
  'Subarachnoid haemorrhage': 'Hémorragie sous-arachnoïdienne',
  'Meningitis': 'Méningite',
  'Sepsis': 'Sepsis',
  'Diabetic ketoacidosis': 'Acidocétose diabétique',
  'Hypoglycaemia': 'Hypoglycémie',
  'Acute appendicitis': 'Appendicite aiguë',
  'Acute pancreatitis': 'Pancréatite aiguë',
  'Upper GI bleed': 'Hémorragie digestive haute',
  'Bowel obstruction': 'Occlusion intestinale',
  'Ectopic pregnancy': 'Grossesse extra-utérine',
  'Anaphylaxis': 'Anaphylaxie',
  'Asthma exacerbation': 'Exacerbation d\'asthme',
  'COPD exacerbation': 'Exacerbation de BPCO',
  'Deep vein thrombosis': 'Thrombose veineuse profonde',
  'Gastro-oesophageal reflux disease': 'Reflux gastro-œsophagien',
  'Peptic ulcer disease': 'Ulcère gastroduodénal',
  'Migraine': 'Migraine',
  'Tension headache': 'Céphalée de tension',
  'Urinary tract infection': 'Infection urinaire',
  'Pyelonephritis': 'Pyélonéphrite',
  'Acute kidney injury': 'Insuffisance rénale aiguë',
  'Thyrotoxicosis': 'Thyrotoxicose',
  'Hypothyroidism': 'Hypothyroïdie',
  'Community-acquired pneumonia': 'Pneumonie communautaire',
  'Cellulitis': 'Cellulite infectieuse',
  'Acute cholecystitis': 'Cholécystite aiguë',
  'Renal colic': 'Colique néphrétique',
  'Epileptic seizure': 'Crise d\'épilepsie',
  'Acute exacerbation of heart failure': 'Décompensation cardiaque aiguë',
  'Unstable angina': 'Angor instable',
  'Gastroenteritis': 'Gastro-entérite',
  'Iron deficiency anaemia': 'Anémie ferriprive',
};

const CONDITION_IT: Record<string, string> = {
  'Acute coronary syndrome': 'Sindrome coronarica acuta',
  'Pulmonary embolism': 'Embolia polmonare',
  'Aortic dissection': 'Dissezione aortica',
  'Tension pneumothorax': 'Pneumotorace iperteso',
  'Pneumonia': 'Polmonite',
  'Acute heart failure': 'Insufficienza cardiaca acuta',
  'Atrial fibrillation': 'Fibrillazione atriale',
  'Stroke (ischaemic)': 'Ictus ischemico',
  'Subarachnoid haemorrhage': 'Emorragia subaracnoidea',
  'Meningitis': 'Meningite',
  'Sepsis': 'Sepsi',
  'Diabetic ketoacidosis': 'Chetoacidosi diabetica',
  'Hypoglycaemia': 'Ipoglicemia',
  'Acute appendicitis': 'Appendicite acuta',
  'Acute pancreatitis': 'Pancreatite acuta',
  'Upper GI bleed': 'Emorragia digestiva alta',
  'Bowel obstruction': 'Occlusione intestinale',
  'Ectopic pregnancy': 'Gravidanza ectopica',
  'Anaphylaxis': 'Anafilassi',
  'Asthma exacerbation': 'Riacutizzazione asmatica',
  'COPD exacerbation': 'Riacutizzazione di BPCO',
  'Deep vein thrombosis': 'Trombosi venosa profonda',
  'Gastro-oesophageal reflux disease': 'Malattia da reflusso gastroesofageo',
  'Peptic ulcer disease': 'Ulcera peptica',
  'Migraine': 'Emicrania',
  'Tension headache': 'Cefalea tensiva',
  'Urinary tract infection': 'Infezione delle vie urinarie',
  'Pyelonephritis': 'Pielonefrite',
  'Acute kidney injury': 'Danno renale acuto',
  'Thyrotoxicosis': 'Tireotossicosi',
  'Hypothyroidism': 'Ipotiroidismo',
  'Community-acquired pneumonia': 'Polmonite acquisita in comunità',
  'Cellulitis': 'Cellulite infettiva',
  'Acute cholecystitis': 'Colecistite acuta',
  'Renal colic': 'Colica renale',
  'Epileptic seizure': 'Crisi epilettica',
  'Acute exacerbation of heart failure': 'Scompenso cardiaco acuto',
  'Unstable angina': 'Angina instabile',
  'Gastroenteritis': 'Gastroenterite',
  'Iron deficiency anaemia': 'Anemia sideropenica',
};

const TERM_FR: Record<string, string> = {
  'chest pain': 'douleur thoracique', 'headache': 'céphalée', 'dyspnoea': 'dyspnée',
  'cough': 'toux', 'fever': 'fièvre', 'nausea': 'nausée', 'vomiting': 'vomissements',
  'diarrhoea': 'diarrhée', 'abdominal pain': 'douleur abdominale', 'palpitations': 'palpitations',
  'dizziness': 'vertige', 'fatigue': 'fatigue', 'diaphoresis': 'sudation',
  'radiating to arm': 'irradiant au bras', 'neck stiffness': 'raideur de la nuque',
  'photophobia': 'photophobie', 'wheeze': 'sibilances', 'syncope': 'syncope',
  'oedema': 'œdème', 'tachycardia': 'tachycardie', 'hypotension': 'hypotension',
  'confusion': 'confusion', 'melaena': 'méléna', 'haematemesis': 'hématémèse',
  'seizure': 'convulsion', 'tremor': 'tremblement', 'pallor': 'pâleur',
  'smoking': 'tabagisme', 'diabetes': 'diabète', 'hypertension': 'hypertension',
  'obesity': 'obésité', 'pregnancy': 'grossesse', 'malignancy': 'néoplasie',
  'family history': 'antécédents familiaux', 'alcohol': 'alcool',
  'Clinical correlation recommended.': 'Corrélation clinique recommandée.',
  'not reported': 'non rapporté',
};

const TERM_IT: Record<string, string> = {
  'chest pain': 'dolore toracico', 'headache': 'cefalea', 'dyspnoea': 'dispnea',
  'cough': 'tosse', 'fever': 'febbre', 'nausea': 'nausea', 'vomiting': 'vomito',
  'diarrhoea': 'diarrea', 'abdominal pain': 'dolore addominale', 'palpitations': 'palpitazioni',
  'dizziness': 'vertigine', 'fatigue': 'astenia', 'diaphoresis': 'sudorazione',
  'radiating to arm': 'irradiato al braccio', 'neck stiffness': 'rigidità nucale',
  'photophobia': 'fotofobia', 'wheeze': 'sibilanti', 'syncope': 'sincope',
  'oedema': 'edema', 'tachycardia': 'tachicardia', 'hypotension': 'ipotensione',
  'confusion': 'confusione', 'melaena': 'melena', 'haematemesis': 'ematemesi',
  'seizure': 'convulsione', 'tremor': 'tremore', 'pallor': 'pallore',
  'smoking': 'fumo', 'diabetes': 'diabete', 'hypertension': 'ipertensione',
  'obesity': 'obesità', 'pregnancy': 'gravidanza', 'malignancy': 'neoplasia',
  'family history': 'anamnesi familiare', 'alcohol': 'alcol',
  'Clinical correlation recommended.': 'Correlazione clinica raccomandata.',
  'not reported': 'non riportato',
};

function translateStr(s: string, dict: Record<string, string>): string {
  let result = s;
  for (const [en, loc] of Object.entries(dict)) {
    result = result.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), loc);
  }
  return result;
}

export function localiseReport(report: ClinReport, lang: Lang): ClinReport {
  if (lang === 'en') return { ...report, lang: 'en' };

  const condDict = lang === 'fr' ? CONDITION_FR : CONDITION_IT;
  const termDict = lang === 'fr' ? TERM_FR : TERM_IT;
  const overallNotes: Record<string, string> = {
    fr: 'Ceci est une analyse d\'aide à la décision clinique, pas un diagnostic. Tous les résultats nécessitent une vérification par un clinicien qualifié. La base de connaissances est un ensemble de démonstration et n\'est pas exhaustive.',
    it: 'Questa è un\'analisi di supporto decisionale clinico, non una diagnosi. Tutti i risultati richiedono revisione e conferma da parte di un medico qualificato. La base di conoscenza è un set dimostrativo e non è esaustiva.',
  };

  return {
    ...report,
    lang,
    overallNote: overallNotes[lang] ?? report.overallNote,
    redFlags: report.redFlags.map(rf => ({
      ...rf,
      pattern: translateStr(rf.pattern, condDict),
      why: translateStr(rf.why, termDict),
      action: translateStr(rf.action, termDict),
    })),
    differential: report.differential.map(d => ({
      ...d,
      condition: condDict[d.condition] ?? d.condition,
      supporting: d.supporting.map(s => translateStr(s, termDict)),
      opposing: d.opposing.map(s => translateStr(s, termDict)),
      rationale: translateStr(d.rationale, { ...condDict, ...termDict }),
      nextStep: translateStr(d.nextStep, termDict),
    })),
    medSafety: report.medSafety.map(m => ({
      ...m,
      explanation: translateStr(m.explanation, termDict),
      recommendation: translateStr(m.recommendation, termDict),
    })),
  };
}
