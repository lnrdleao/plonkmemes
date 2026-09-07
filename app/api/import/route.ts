import { NextRequest, NextResponse } from 'next/server';
import { SoundItem } from '@/app/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL do MyInstants é obrigatória.' },
        { status: 400 }
      );
    }

    if (!url.includes('myinstants.com')) {
      return NextResponse.json(
        { success: false, error: 'A URL deve ser do site myinstants.com' },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Falha ao acessar o MyInstants (Status: ${response.status}). Verifique o link.`,
        },
        { status: 400 }
      );
    }

    const html = await response.text();

    let title = '';
    const h1Match = html.match(/<h1[^>]*id="instant-page-title"[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      title = h1Match[1].trim();
    } else {
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].replace(' - Myinstants', '').trim();
      }
    }

    if (!title) {
      const slugFromUrl = url.split('/instant/')[1]?.replace(/\/$/, '') || 'Novo Som';
      title = slugFromUrl
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    let audioUrl = '';
    const playMatch = html.match(/play\('(\/media\/sounds\/[^']+)'\)/i);
    if (playMatch && playMatch[1]) {
      audioUrl = `https://www.myinstants.com${playMatch[1]}`;
    } else {
      const genericMp3Match = html.match(/\/media\/sounds\/([a-zA-Z0-9_\-.]+\.mp3)/i);
      if (genericMp3Match && genericMp3Match[1]) {
        audioUrl = `https://www.myinstants.com/media/sounds/${genericMp3Match[1]}`;
      }
    }

    if (!audioUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível encontrar o arquivo de áudio MP3 na página fornecida.',
        },
        { status: 422 }
      );
    }

    const colors = [
      '#E11D48',
      '#8B5CF6',
      '#0EA5E9',
      '#F59E0B',
      '#10B981',
      '#EC4899',
      '#6366F1',
      '#EF4444',
      '#14B8A6',
      '#06B6D4',
    ];
    const colorIndex = Math.abs(
      title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    );

    const sound: SoundItem = {
      id: `imported-${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      audioUrl,
      category: 'memes-web',
      color: colors[colorIndex],
      plays: 1,
      duration: 2.0,
      tags: ['importado', 'myinstants'],
      isCustom: true,
    };

    return NextResponse.json({ success: true, sound });
  } catch (error) {
    console.error('Erro ao importar do MyInstants:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao processar a importação.',
      },
      { status: 500 }
    );
  }
}
