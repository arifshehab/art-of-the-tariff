import { NextResponse } from 'next/server';
import tariffData from '@/data/tariffs.json';

export const revalidate = 86400; // 24 hours

export async function GET() {
  return NextResponse.json(tariffData);
}
