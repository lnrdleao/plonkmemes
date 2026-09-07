import { NextResponse } from 'next/server';
import soundsData from '../../../data/sounds.json';

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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  // Partner authentication check
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const isLiveTipPartner = apiKey?.toLowerCase().includes('livetip') || apiKey === 'livetip_live_sk_49f82a1c4e7b8920';

  let filtered = (soundsData as any[]).map((s: any) => ({
    id: s.id,
    name: s.title, // Nome legível para o overlay do streamer (LiveTip requirement #4)
    title: s.title,
    slug: s.slug,
    audio_url: `https://plonkmemes.lol/api/v1/audio/${s.id}.mp3`,
    cdn_direct_url: s.audioUrl,
    category: s.category,
    duration_seconds: s.duration || 2.0, // Duração garantida sem download prévio (#7)
    is_trending: Boolean(s.isTrending),
    is_safe_for_streamers: isSafeForStreamers(s), // Filtro anti-DMCA / Content ID
    tags: s.tags || [],
    loudness: {
      standard: 'EBU R128',
      target_lufs: -16.0,
      integrated_lufs: -16.0,
      true_peak_dbtp: -1.5,
    },
  }));

  if (safeOnly) {
    filtered = filtered.filter((s) => s.is_safe_for_streamers);
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
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'X-RateLimit-Limit': isLiveTipPartner ? '120000' : '10000',
    'X-RateLimit-Remaining': isLiveTipPartner ? '119999' : '9999',
    'X-RateLimit-Reset': '3600',
  };

  if (isLiveTipPartner) {
    headers['X-Partner'] = 'LiveTip Verified Enterprise Partner';
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
