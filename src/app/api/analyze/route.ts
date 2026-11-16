import { NextRequest, NextResponse } from 'next/server';
import { runClinReason } from '@/lib/ai/pipeline';
import type { Lang } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseText, lang } = body as { caseText: string; lang: Lang | 'auto' };

    if (!caseText || caseText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a clinical case description (at least 10 characters).' },
        { status: 400 }
      );
    }

    const report = runClinReason(caseText, lang ?? 'auto');
    return NextResponse.json(report);
  } catch (err) {
    console.error('ClinReason pipeline error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
