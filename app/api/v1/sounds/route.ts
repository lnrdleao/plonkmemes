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

  let filtered = (soundsData as any[]).map((s: any) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    audio_url: s.audioUrl,
    category: s.category,
    duration_seconds: s.duration || 2.0,
    is_trending: Boolean(s.isTrending),
    is_safe_for_streamers: isSafeForStreamers(s),
    tags: s.tags || [],
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
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
