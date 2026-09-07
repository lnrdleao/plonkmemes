import { NextResponse } from 'next/server';
import soundsData from '../../../../data/sounds.json';

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
  const { id } = await params;
  const sound = (soundsData as any[]).find((s: any) => s.id === id || s.slug === id);

  if (!sound) {
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: sound.id,
      title: sound.title,
      slug: sound.slug,
      audio_url: sound.audioUrl,
      category: sound.category,
      duration_seconds: sound.duration || 2.0,
      is_trending: Boolean(sound.isTrending),
      is_safe_for_streamers: isSafeForStreamers(sound),
      tags: sound.tags || [],
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, s-maxage=3600, immutable',
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
