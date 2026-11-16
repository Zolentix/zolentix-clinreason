export type Lang = "en" | "fr" | "it";

export type BodySystem = "cardiac" | "respiratory" | "neuro" | "GI" | "renal" | "endocrine" | "musculoskeletal" | "vascular" | "haematological" | "infectious" | "dermatological" | "psychiatric" | "obstetric" | "ENT" | "ophthalmological";

export type BodyRegion = "head" | "neck" | "chest" | "abdomen" | "pelvis" | "upper_limb" | "lower_limb" | "back" | "skin" | "systemic";

export interface PatientCase {
  rawText: string;
  lang: Lang;
  age?: number;
  sex?: "male" | "female" | "other" | "unknown";
  presentingComplaint: string;
  symptoms: { name: string; duration?: string; severity?: string }[];
  vitals?: { bp?: string; hr?: number; temp?: number; spo2?: number; rr?: number };
  history: string[];
  medications: { name: string; dose?: string; freq?: string }[];
  allergies: string[];
  riskFactors: string[];
  selectedRegions?: string[];
}

export interface RedFlag {
  pattern: string;
  why: string;
  action: string;
  severity: "emergency" | "urgent";
}

export interface DifferentialItem {
  condition: string;
  icd10?: string;
  confidence: number;
  supporting: string[];
  opposing: string[];
  rationale: string;
  nextStep: string;
  citations: { source: string; note: string }[];
  system?: string;
  regions?: string[];
}

export interface MedSafetyItem {
  kind: "interaction" | "contraindication" | "dosing" | "duplication";
  drugs: string[];
  severity: "severe" | "moderate" | "mild";
  explanation: string;
  recommendation: string;
  citations: { source: string; note: string }[];
}

export interface ClinReport {
  case: PatientCase;
  redFlags: RedFlag[];
  differential: DifferentialItem[];
  medSafety: MedSafetyItem[];
  overallNote: string;
  lang: Lang;
}

export interface RedFlagRule {
  pattern: string;
  requiredFeatures: string[];
  anyOfFeatures: string[];
  severity: "emergency" | "urgent";
  action: string;
}

export interface Condition {
  name: string;
  icd10: string;
  system: string;
  regions?: string[];
  typicalFeatures: string[];
  riskFactors: string[];
  redFlagFeatures: string[];
  investigations?: string[];
  keyManagement?: string;
  prevalence?: "common" | "uncommon" | "rare";
  acuity?: "hyperacute" | "acute" | "subacute" | "chronic";
}

export interface Interaction {
  drugA: string;
  drugB: string;
  severity: "severe" | "moderate" | "mild";
  mechanism: string;
  effect: string;
  management: string;
}
