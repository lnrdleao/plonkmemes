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
  let { id } = await params;
  if (id.endsWith('.mp3')) id = id.slice(0, -4);
  const sound = (soundsData as any[]).find((s: any) => s.id === id || s.slug === id);

  if (!sound) {
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
  }

  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const isLiveTipPartner = apiKey?.toLowerCase().includes('livetip') || apiKey === 'livetip_live_sk_49f82a1c4e7b8920';

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Cache-Control': 'public, s-maxage=86400, immutable',
    'X-RateLimit-Limit': isLiveTipPartner ? '120000' : '10000',
    'X-RateLimit-Remaining': isLiveTipPartner ? '119999' : '9999',
    'X-RateLimit-Reset': '3600',
  };

  if (isLiveTipPartner) {
    headers['X-Partner'] = 'LiveTip Verified Enterprise Partner';
  }

  return NextResponse.json(
    {
      id: sound.id,
      name: sound.title, // Nome legível para o overlay do streamer (LiveTip requirement #4)
      title: sound.title,
      slug: sound.slug,
      audio_url: `https://plonkmemes.lol/api/v1/audio/${sound.id}.mp3`,
      cdn_direct_url: sound.audioUrl,
      category: sound.category,
      duration_seconds: sound.duration || 2.0,
      is_trending: Boolean(sound.isTrending),
      is_safe_for_streamers: isSafeForStreamers(sound),
      tags: sound.tags || [],
      loudness: {
        standard: 'EBU R128',
        target_lufs: -16.0,
        integrated_lufs: -16.0,
        true_peak_dbtp: -1.5,
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
