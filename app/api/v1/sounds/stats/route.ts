import { NextResponse } from 'next/server';
import { getSoundStats } from '@/app/lib/statsService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSoundStats();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (err: any) {
    console.error('[API Stats] Erro ao buscar estatísticas:', err);
    return NextResponse.json(
      {
        stats: {},
        totalPlays: 0,
        error: 'Failed to fetch sound statistics',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}
