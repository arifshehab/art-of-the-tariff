import { NextResponse } from 'next/server';
import statutoryData from '@/data/statutory_tariffs_2026-06-28.json';
import upcoming301Data from '@/data/upcoming_301_tariffs.json';
import { normalize } from '@/lib/normalizeTariffs';

export const revalidate = 86400; // 24 hours

export async function GET() {
  return NextResponse.json(normalize(statutoryData, upcoming301Data));
}
