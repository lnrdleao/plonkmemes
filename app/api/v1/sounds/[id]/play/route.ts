import { NextResponse } from 'next/server';
import { recordSoundPlay } from '@/app/lib/statsService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let { id } = await params;
  if (id.endsWith('.mp3')) id = id.slice(0, -4);

  try {
    const updatedPlays = await recordSoundPlay(id);

    return NextResponse.json(
      {
        success: true,
        sound_id: id,
        plays: updatedPlays,
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API Play] Erro ao registrar play:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record play',
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
