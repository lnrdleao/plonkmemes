import { NextResponse } from 'next/server';
import soundsData from '../../../../data/sounds.json';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let { id } = await params;
  if (id.endsWith('.mp3')) {
    id = id.slice(0, -4);
  }

  const sound = (soundsData as any[]).find((s: any) => s.id === id || s.slug === id);
  const targetUrl = sound?.audioUrl || `https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/${id}.mp3`;

  const range = request.headers.get('range');
  const fetchHeaders: HeadersInit = {};
  if (range) {
    fetchHeaders['range'] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: fetchHeaders,
      cache: 'force-cache',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(JSON.stringify({ error: 'Audio file not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'audio/mpeg');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, X-API-Key');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Audio-Codec', 'mp3');
    responseHeaders.set('X-Loudness-Target', '-16 LUFS (EBU R128)');

    if (upstreamRes.headers.get('content-range')) {
      responseHeaders.set('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch audio stream' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let { id } = await params;
  if (id.endsWith('.mp3')) id = id.slice(0, -4);
  const sound = (soundsData as any[]).find((s: any) => s.id === id || s.slug === id);
  const targetUrl = sound?.audioUrl || `https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/${id}.mp3`;

  try {
    const upstreamRes = await fetch(targetUrl, { method: 'HEAD' });
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'audio/mpeg');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    if (upstreamRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    return new NextResponse(null, { status: 200, headers: responseHeaders });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
