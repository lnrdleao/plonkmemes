import { NextResponse } from 'next/server';

const VALID_LIVETIP_KEYS = new Set([
  'livetip_live_sk_7e92b1a8f4c03d65e219',
]);

export async function GET(request: Request) {
  const rawKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!rawKey || !VALID_LIVETIP_KEYS.has(rawKey)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Valid API key required in X-API-Key or Authorization header.',
      },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  return NextResponse.json(
    {
      removed_sounds: [],
      last_sync: new Date().toISOString(),
      since: since || null,
      message: 'Nenhum som depreciado ou removido no período consultado.',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Partner': 'LiveTip Verified Enterprise Partner',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
