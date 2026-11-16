import { NextResponse } from 'next/server';
import interactions from '@/lib/knowledge/interactions.json';

export async function GET() {
  return NextResponse.json(interactions);
}
