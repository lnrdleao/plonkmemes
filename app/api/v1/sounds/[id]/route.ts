import { NextResponse } from 'next/server';
import soundsData from '../../../../data/sounds.json';

const VALID_LIVETIP_KEYS = new Set([
  'livetip_live_sk_7e92b1a8f4c03d65e219',
]);

function isSafeForStreamers(sound: any): boolean {
  if (sound.category === 'musica') return false;
  const text = (sound.title + ' ' + (sound.tags || []).join(' ')).toLowerCase();
  const dangerousKeywords = ['funk', 'remix', 'song', 'clipe', 'abertura', 'tema', 'beat', 'trap', 'music'];
  return !dangerousKeywords.some((k) => text.includes(k));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let { id } = await params;
  if (id.endsWith('.mp3')) id = id.slice(0, -4);
  const sound = (soundsData as any[]).find((s: any) => s.id === id || s.slug === id);

  if (!sound) {
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
  }

  // Autenticação Estrita Obrigatória
  const rawKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!rawKey) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'API key required. Please provide a valid partner key in the X-API-Key or Authorization header.',
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

  if (!VALID_LIVETIP_KEYS.has(rawKey)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or revoked API Key. Access denied.',
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

  return NextResponse.json(
    {
      id: sound.id,
      name: sound.title,
      title: sound.title,
      slug: sound.slug,
      audio_url: `https://plonkmemes.lol/api/v1/audio/${sound.id}.mp3`,
      cdn_direct_url: sound.audioUrl,
      category: sound.category,
      duration_seconds: typeof sound.duration === 'number' ? sound.duration : 2.0,
      is_trending: Boolean(sound.isTrending),
      is_safe_for_streamers: isSafeForStreamers(sound),
      tags: sound.tags || [],
      loudness: sound.loudness || {
        standard: 'EBU R128',
        target_lufs: -16.0,
        integrated_lufs: -16.0,
        true_peak_dbtp: -1.5,
        loudness_range_lra: 1.0,
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Partner': 'LiveTip Verified Enterprise Partner',
        'X-RateLimit-Limit': '120000',
        'X-RateLimit-Remaining': '119999',
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
