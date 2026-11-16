import { NextRequest, NextResponse } from 'next/server';
import { localiseReport } from '@/lib/ai/localise';
import type { ClinReport, Lang } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { report, lang } = body as { report: ClinReport; lang: Lang };

    if (!report || !lang) {
      return NextResponse.json({ error: 'Missing report or lang' }, { status: 400 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY is not configured.' }, { status: 500 });
    }

    const localised = await localiseReport(report, lang);
    return NextResponse.json(localised);
  } catch (err) {
    console.error('Localise error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
