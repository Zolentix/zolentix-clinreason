import { askGemini, extractJSON } from './gemini';
import type { ClinReport, Lang } from '../types';

export async function localiseReport(
  report: ClinReport,
  lang: Lang
): Promise<ClinReport> {
  if (lang === 'en') return { ...report, lang: 'en' };

  const langName = lang === 'fr' ? 'French' : 'Italian';

  const toTranslate = {
    redFlags: report.redFlags.map((r) => ({
      pattern: r.pattern,
      why: r.why,
      action: r.action,
    })),
    differential: report.differential.map((d) => ({
      condition: d.condition,
      supporting: d.supporting,
      opposing: d.opposing,
      rationale: d.rationale,
      nextStep: d.nextStep,
      citations: d.citations.map((c) => c.note),
    })),
    medSafety: report.medSafety.map((m) => ({
      explanation: m.explanation,
      recommendation: m.recommendation,
      citations: m.citations.map((c) => c.note),
    })),
    overallNote: report.overallNote,
  };

  try {
    const text = await askGemini(
      `You are a medical translator. Translate the clinical text into ${langName} using correct, professional clinical terminology that a physician in that language would use. Preserve all clinical meaning exactly. Do not add, remove, soften, or embellish any clinical content. Keep drug names and ICD-10 codes unchanged. Output the same JSON structure with translated string values.`,
      `Translate all string values in this JSON to ${langName}. Keep the exact same structure. Output ONLY the JSON, no markdown fences.\n\n${JSON.stringify(toTranslate, null, 2)}`
    );

    const cleaned = extractJSON(text);
    const translated = JSON.parse(cleaned);
    const result: ClinReport = {
      ...report,
      lang,
      overallNote: translated.overallNote ?? report.overallNote,
      redFlags: report.redFlags.map((r, i) => ({
        ...r,
        pattern: translated.redFlags?.[i]?.pattern ?? r.pattern,
        why: translated.redFlags?.[i]?.why ?? r.why,
        action: translated.redFlags?.[i]?.action ?? r.action,
      })),
      differential: report.differential.map((d, i) => ({
        ...d,
        condition: translated.differential?.[i]?.condition ?? d.condition,
        supporting: translated.differential?.[i]?.supporting ?? d.supporting,
        opposing: translated.differential?.[i]?.opposing ?? d.opposing,
        rationale: translated.differential?.[i]?.rationale ?? d.rationale,
        nextStep: translated.differential?.[i]?.nextStep ?? d.nextStep,
        citations: d.citations.map((c, j) => ({
          ...c,
          note: translated.differential?.[i]?.citations?.[j] ?? c.note,
        })),
      })),
      medSafety: report.medSafety.map((m, i) => ({
        ...m,
        explanation: translated.medSafety?.[i]?.explanation ?? m.explanation,
        recommendation: translated.medSafety?.[i]?.recommendation ?? m.recommendation,
        citations: m.citations.map((c, j) => ({
          ...c,
          note: translated.medSafety?.[i]?.citations?.[j] ?? c.note,
        })),
      })),
    };
    return result;
  } catch (err) {
    console.error('Localisation failed, returning English report:', err);
    return { ...report, lang };
  }
}
