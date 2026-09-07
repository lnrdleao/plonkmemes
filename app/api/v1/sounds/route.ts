import { NextResponse } from 'next/server';
import soundsData from '../../../data/sounds.json';

const VALID_LIVETIP_KEYS = new Set([
  'livetip_live_sk_7e92b1a8f4c03d65e219',
]);

function isSafeForStreamers(sound: any): boolean {
  if (sound.category === 'musica') return false;
  const text = (sound.title + ' ' + (sound.tags || []).join(' ')).toLowerCase();
  const dangerousKeywords = ['funk', 'remix', 'song', 'clipe', 'abertura', 'tema', 'beat', 'trap', 'music'];
  return !dangerousKeywords.some((k) => text.includes(k));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase();
  const category = searchParams.get('category');
  const trending = searchParams.get('trending');
  const safeOnly = searchParams.get('safe_only') === 'true';
  const maxDurationParam = searchParams.get('max_duration');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

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

  let filtered = (soundsData as any[]).map((s: any) => ({
    id: s.id,
    name: s.title,
    title: s.title,
    slug: s.slug,
    audio_url: `https://plonkmemes.lol/api/v1/audio/${s.id}.mp3`,
    cdn_direct_url: s.audioUrl,
    category: s.category,
    duration_seconds: typeof s.duration === 'number' ? s.duration : 2.0,
    is_trending: Boolean(s.isTrending),
    is_safe_for_streamers: isSafeForStreamers(s),
    tags: s.tags || [],
    loudness: s.loudness || {
      standard: 'EBU R128',
      target_lufs: -16.0,
      integrated_lufs: -16.0,
      true_peak_dbtp: -1.5,
      loudness_range_lra: 1.0,
    },
  }));

  if (safeOnly) {
    filtered = filtered.filter((s) => s.is_safe_for_streamers);
  }

  if (maxDurationParam) {
    const maxD = parseFloat(maxDurationParam);
    if (!isNaN(maxD) && maxD > 0) {
      filtered = filtered.filter((s) => s.duration_seconds <= maxD);
    }
  }

  if (trending === 'true') {
    filtered = filtered.filter((s) => s.is_trending);
  }

  if (category && category !== 'todos') {
    filtered = filtered.filter((s) => s.category === category);
  }

  if (q) {
    filtered = filtered.filter(
      (s) => s.title.toLowerCase().includes(q) || s.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
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
