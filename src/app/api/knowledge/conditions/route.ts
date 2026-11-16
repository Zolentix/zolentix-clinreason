import { NextResponse } from 'next/server';
import conditions from '@/lib/knowledge/conditions.json';

export async function GET() {
  return NextResponse.json(conditions);
}
