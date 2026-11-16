import type { PatientCase, Lang } from '../types';
import { detectLang } from '../i18n/strings';

const DRUG_NAMES = [
  'warfarin','ibuprofen','aspirin','amoxicillin','fluconazole','metronidazole',
  'spironolactone','tramadol','simvastatin','metformin','digoxin','amiodarone',
  'verapamil','lithium','clopidogrel','omeprazole','ciprofloxacin','theophylline',
  'tizanidine','methotrexate','trimethoprim','carbamazepine','erythromycin',
  'phenytoin','valproate','allopurinol','azathioprine','citalopram','domperidone',
  'ramipril','bendroflumethiazide','amitriptyline','clarithromycin','colchicine',
  'rivaroxaban','ketoconazole','dabigatran','insulin','pioglitazone','diclofenac',
  'gentamicin','furosemide','prednisolone','prednisone','doxycycline',
  'sildenafil','azithromycin','fluoxetine','tamoxifen','fluvoxamine',
  'levodopa','metoclopramide','clozapine','ergotamine','sulfonylurea',
  'paracetamol','acetaminophen','atorvastatin','amlodipine','bisoprolol',
  'propranolol','atenolol','metoprolol','carvedilol','losartan','lisinopril',
  'pantoprazole','lansoprazole','morphine','codeine','gabapentin','pregabalin',
  'sertraline','escitalopram','venlafaxine','duloxetine','mirtazapine',
  'apixaban','enoxaparin','heparin','levothyroxine','gliclazide','glipizide',
];

function extractAge(text: string): number | undefined {
  const patterns = [
    /(\d{1,3})\s*[-–]?\s*year\s*[-–]?\s*old/i,
    /(?:aged?|age)\s*:?\s*(\d{1,3})/i,
    /(\d{1,3})\s*ans\b/i,
    /(\d{1,3})\s*anni\b/i,
    /\b(\d{1,3})\s*y\s*(?:[\/,\s]|$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { const a = parseInt(m[1]); if (a > 0 && a < 130) return a; }
  }
  return undefined;
}

function extractSex(text: string): 'male' | 'female' | 'unknown' {
  if (/\b(man|male|homme|uomo|maschio|boy|garçon|ragazzo)\b/i.test(text)) return 'male';
  if (/\b(woman|female|femme|donna|femmina|girl|fille|ragazza)\b/i.test(text)) return 'female';
  return 'unknown';
}

function extractVitals(text: string) {
  const v: Record<string, number | string> = {};
  const bp = text.match(/(?:BP|blood pressure|tension|PA|pressione)\s*:?\s*(\d{2,3}\s*\/\s*\d{2,3})/i);
  if (bp) v.bp = bp[1].replace(/\s/g, '');
  const hr = text.match(/(?:HR|heart rate|pulse|FC|frequenza cardiaca)\s*:?\s*(\d{2,3})/i);
  if (hr) v.hr = parseInt(hr[1]);
  const temp = text.match(/(?:temp(?:erature|érature|eratura)?)\s*:?\s*([\d.]+)\s*°?/i);
  if (temp) v.temp = parseFloat(temp[1]);
  const spo2 = text.match(/(?:SpO2|spo2|sat(?:uration)?|O2)\s*:?\s*(\d{2,3})\s*%?/i);
  if (spo2) v.spo2 = parseInt(spo2[1]);
  const rr = text.match(/(?:RR|respiratory rate|resp rate|FR)\s*:?\s*(\d{1,2})/i);
  if (rr) v.rr = parseInt(rr[1]);
  return Object.keys(v).length > 0 ? v as any : undefined;
}

function extractMedications(text: string): { name: string; dose?: string }[] {
  const lower = text.toLowerCase();
  const found: { name: string; dose?: string }[] = [];
  const seen = new Set<string>();
  for (const drug of DRUG_NAMES) {
    if (lower.includes(drug) && !seen.has(drug)) {
      seen.add(drug);
      const idx = lower.indexOf(drug);
      const nearby = text.slice(idx, idx + drug.length + 30);
      const doseMatch = nearby.match(/(\d+\s*(?:mg|mcg|g|ml|units?))/i);
      found.push({ name: drug.charAt(0).toUpperCase() + drug.slice(1), dose: doseMatch?.[1] });
    }
  }
  return found;
}

const SYMPTOM_PATTERNS: [RegExp, string][] = [
  [/chest pain|douleur thoracique|dolore toracico/i, 'chest pain'],
  [/headache|céphalée|cefalea|mal de tête/i, 'headache'],
  [/dyspno[ea]|shortness of breath|essoufflement|dispnea/i, 'dyspnoea'],
  [/cough|toux|tosse/i, 'cough'],
  [/fever|fièvre|febbre/i, 'fever'],
  [/nausea|nausée/i, 'nausea'],
  [/vomit(?:ing)?|vomissement/i, 'vomiting'],
  [/diarrh[oe]a|diarrhée|diarrea/i, 'diarrhoea'],
  [/abdominal pain|douleur abdominale|dolore addominale/i, 'abdominal pain'],
  [/palpitation/i, 'palpitations'],
  [/dizz(?:y|iness)|vertige|vertigini/i, 'dizziness'],
  [/fatigue|tired|stanchezza/i, 'fatigue'],
  [/sweat(?:ing)?|diaphoresis|sueur|sudorazione/i, 'diaphoresis'],
  [/radiating to (?:the )?(?:left )?arm|irradiant? (?:au|al) bras/i, 'radiating to arm'],
  [/radiating to (?:the )?jaw/i, 'radiating to jaw'],
  [/radiating to (?:the )?back|irradiant? (?:au|al) dos/i, 'radiating to back'],
  [/neck stiffness|raideur (?:de (?:la )?)?nuque|rigidità/i, 'neck stiffness'],
  [/photophob/i, 'photophobia'],
  [/wheez/i, 'wheeze'],
  [/haemoptysis|hemoptysis/i, 'haemoptysis'],
  [/syncope|faint/i, 'syncope'],
  [/oedema|edema|swelling/i, 'oedema'],
  [/tachycard/i, 'tachycardia'],
  [/hypotens/i, 'hypotension'],
  [/confusion|altered (?:mental )?status|confused/i, 'confusion'],
  [/melaena|melena|black (?:tarry )?stool/i, 'melaena'],
  [/haematemesis|hematemesis|vomiting blood/i, 'haematemesis'],
  [/dysuria|painful urinat/i, 'dysuria'],
  [/urticaria|hives/i, 'urticaria'],
  [/rash|éruption/i, 'rash'],
  [/seizure|convulsion/i, 'seizure'],
  [/tremor/i, 'tremor'],
  [/weight loss|perte de poids/i, 'weight loss'],
  [/constipat/i, 'constipation'],
  [/leg swelling/i, 'unilateral leg swelling'],
  [/visual (?:loss|disturbance)|blurr/i, 'visual loss'],
  [/facial droop/i, 'facial droop'],
  [/speech difficult|slurred speech|aphasie/i, 'speech difficulty'],
  [/weakness|faiblesse/i, 'weakness'],
  [/thunderclap|coup de tonnerre/i, 'thunderclap headache'],
  [/worst headache|pire (?:des )?céphalée/i, 'worst headache of life'],
  [/orthopno/i, 'orthopnoea'],
  [/pallor|pale|pâleur/i, 'pallor'],
  [/anorexia|loss of appetite/i, 'anorexia'],
  [/pleuritic/i, 'pleuritic chest pain'],
  [/purulent sputum|sputum purulent/i, 'purulent sputum'],
  [/crackles|râles/i, 'crackles'],
  [/distension|distension abdominale/i, 'distension'],
];

function extractSymptoms(text: string): { name: string; duration?: string }[] {
  const symptoms: { name: string; duration?: string }[] = [];
  const seen = new Set<string>();
  for (const [pattern, name] of SYMPTOM_PATTERNS) {
    if (pattern.test(text) && !seen.has(name)) {
      seen.add(name);
      const dm = text.match(new RegExp(`(?:for|since|depuis|da)\\s+(\\d+\\s*(?:hour|day|week|month|minute|heure|jour|semaine|mois|ora|giorno)s?)`, 'i'));
      symptoms.push({ name, duration: dm?.[1] });
    }
  }
  return symptoms;
}

function extractAllergies(text: string): string[] {
  if (/\bNKDA\b/.test(text)) return [];
  const allergies: string[] = [];
  const m = text.match(/(?:allerg(?:ic|y|ie)\s*(?:to|à|a)\s*)([\w\s,]+?)(?:\.|,\s*(?!and)|$)/i);
  if (m) allergies.push(...m[1].split(/,\s*|\s+and\s+/).map(a => a.trim()).filter(Boolean));
  if (/penicillin/i.test(text) && !allergies.some(a => /penicillin/i.test(a))) allergies.push('penicillin');
  return [...new Set(allergies)];
}

function extractRiskFactors(text: string): string[] {
  const factors: string[] = [];
  const checks: [RegExp, string][] = [
    [/\bsmok/i, 'smoking'], [/\bdiabet/i, 'diabetes'], [/\bhypertens/i, 'hypertension'],
    [/\bcholesterol|hyperlipid|dyslipid/i, 'hyperlipidaemia'], [/\bobes/i, 'obesity'],
    [/\bimmobil|bedbound/i, 'recent immobility'], [/\bpregnant|pregnancy|enceinte/i, 'pregnancy'],
    [/\boral contraceptive|OCP/i, 'oral contraceptive'], [/\bsurgery|operation/i, 'recent surgery'],
    [/\bmalignan|cancer|tumour/i, 'malignancy'], [/\bfamily history|antécédents familiaux/i, 'family history'],
    [/\balcohol|éthylisme/i, 'alcohol'], [/\bimmunos?uppress/i, 'immunosuppression'],
    [/\batrial fibrillation|\bAF\b|\bAFib\b/i, 'atrial fibrillation'],
    [/\bCOPD|chronic obstructive/i, 'COPD'], [/\basthma/i, 'asthma'],
    [/\bheart failure/i, 'heart failure'], [/\brenal|kidney/i, 'renal impairment'],
  ];
  for (const [p, n] of checks) { if (p.test(text)) factors.push(n); }
  return factors;
}

function extractHistory(text: string): string[] {
  const history: string[] = [];
  const matches = text.matchAll(/(?:history of|antécédents? (?:de |d')?|known|previous)\s+([\w\s]+?)(?:\.|,|and\s|$)/gi);
  for (const m of matches) { if (m[1]) history.push(m[1].trim()); }
  const conds: [RegExp, string][] = [
    [/\bdiabet/i, 'diabetes'], [/\bhypertens/i, 'hypertension'],
    [/\batrial fibrillation/i, 'atrial fibrillation'], [/\bCOPD/i, 'COPD'],
    [/\basthma/i, 'asthma'], [/\bDVT|deep vein thrombosis/i, 'DVT'],
  ];
  for (const [p, n] of conds) { if (p.test(text) && !history.includes(n)) history.push(n); }
  return [...new Set(history)];
}

export function parseIntake(rawText: string, selectedLang: Lang | 'auto'): PatientCase {
  const lang = selectedLang === 'auto' ? detectLang(rawText) : selectedLang;
  const sentences = rawText.split(/[.!]\s+/);
  return {
    rawText,
    lang,
    age: extractAge(rawText),
    sex: extractSex(rawText),
    presentingComplaint: (sentences[0] || rawText).trim().slice(0, 200),
    symptoms: extractSymptoms(rawText),
    vitals: extractVitals(rawText),
    history: extractHistory(rawText),
    medications: extractMedications(rawText),
    allergies: extractAllergies(rawText),
    riskFactors: extractRiskFactors(rawText),
  };
}
