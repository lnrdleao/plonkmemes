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

  // Strict API Key Validation (LiveTip Divergência C)
  const rawKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  let isLiveTipPartner = false;

  if (rawKey) {
    if (VALID_LIVETIP_KEYS.has(rawKey)) {
      isLiveTipPartner = true;
    } else {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired API Key. Access denied.',
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
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  };

  if (isLiveTipPartner) {
    headers['X-Partner'] = 'LiveTip Verified Enterprise Partner';
    headers['X-RateLimit-Limit'] = '120000';
    headers['X-RateLimit-Remaining'] = '119999';
    headers['X-RateLimit-Reset'] = '3600';
  } else {
    headers['X-Partner'] = 'Public Free Tier';
    headers['X-RateLimit-Limit'] = '1000';
    headers['X-RateLimit-Remaining'] = '999';
    headers['X-RateLimit-Reset'] = '3600';
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
    { headers }
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
