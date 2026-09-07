# Guia Oficial de Integração Técnica: PlonkMemes ↔ LiveTip

> **Versão da API:** `v1`  
> **Base URL:** `https://plonkmemes.vercel.app/api/v1`  
> **Status dos Serviços:** Produção Ativa  
> **Destinatário:** Equipe de Engenharia e Produto da LiveTip

---

## 1. Visão Geral da Integração

A integração entre a **LiveTip** e a **PlonkMemes** permite que criadores de conteúdo e streamers configurem e reproduzam alertas sonoros (memes, efeitos, reações e punchlines) instantaneamente em suas transmissões ao vivo durante doações (Pix, Bits, Tips, Super Chats).

A arquitetura foi projetada especificamente para as restrições de **Browser Sources no OBS Studio / Streamlabs (Chromium Embedded Framework - CEF)**, garantindo:
1. **Latência Zero:** Resposta imediata no momento da confirmação do evento de tip.
2. **Proteção Anti-DMCA / Content ID:** Categorização estrita para evitar silenciamento de VODs na Twitch ou strikes no YouTube.
3. **Compatibilidade CEF/CORS:** Cabeçalhos abertos `*` e suporte obrigatório a `Range: bytes` (HTTP 206).

---

## 2. Bloco A: Inegociáveis e Compliance (Streaming & Direitos)

### 2.1. Licença de Uso Comercial para Streamers
- **Autorização:** Todos os áudios do catálogo marcados como `is_safe_for_streamers: true` estão liberados para execução em transmissões ao vivo monetizadas e arquivamento de VODs na LiveTip e plataformas parceiras (Twitch, YouTube, Kick, TikTok Live).
- **Finalidade:** O uso é restrito ao contexto de alertas de streaming, interação de chat e doações. É vedada a comercialização avulsa dos arquivos de áudio em formato isolado como pacote de samples musicais.

### 2.2. Proteção Anti-Content ID e DMCA Safe
- **Filtro Obrigatório:** Ao listar sons para seleção do streamer na interface da LiveTip, utilize sempre o parâmetro:
  ```text
  GET /api/v1/sounds?safe_only=true
  ```
- **Critério de Classificação:**
  - A PlonkMemes filtra e isola termos e faixas que possam conter trechos de fonogramas registrados em sociedades de direitos autorais ou gravadoras (ex.: faixas de funk/trap comerciais, músicas com selo de gravadora).
  - Sons contendo trechos musicais protegidos recebem `is_safe_for_streamers: false` e são excluídos com `safe_only=true`.

### 2.3. Espelhamento e Cache de Mídia (S3 / Cloudflare R2)
- A LiveTip **tem autorização explícita** para baixar e armazenar em cache os arquivos de áudio (`.mp3`) em sua própria infraestrutura de CDN (ex.: AWS S3, Cloudflare R2) para garantir soberania de entrega, redundância e isolamento de latência.
- O campo `id` e `slug` de cada som é imutável, permitindo indexação determinística em seu banco de dados local.

### 2.4. Sincronização de Depreciações e Remoções
- Em caso de notificações de DMCA ou solicitação de criadores, sons podem ser desativados.
- A LiveTip deve consultar periodicamente o endpoint:
  ```text
  GET /api/v1/sounds/deprecations?since=YYYY-MM-DDTHH:mm:ssZ
  ```
- Quaisquer IDs retornados nesta lista devem ser desativados da galeria de escolha dos streamers.

---

## 3. Bloco B: Requisitos Técnicos de Áudio e OBS (CEF)

### 3.1. Formato e Especificação do Áudio
- **Container / Codec:** MP3 (`audio/mpeg`).
- **Sample Rate:** 44.1 kHz / 16-bit estéreo ou mono.
- **Bitrate:** 128 kbps a 192 kbps (otimizado para carregamento instantâneo com tamanho médio entre 50 KB e 250 KB por som).

### 3.2. Suporte a CORS e Range Requests (HTTP 206)
- **Problema clássico no OBS Studio:** O Chromium Embedded Framework (CEF) utilizado pelo OBS exige suporte ao cabeçalho `Range: bytes` para calcular a duração e iniciar o streaming de áudio. CDNs sem suporte a HTTP 206 causam travamentos silenciosos ou delay de buffer no alerta.
- **Garantia PlonkMemes:**
  - `Access-Control-Allow-Origin: *`
  - `Accept-Ranges: bytes`
  - Resposta padrão `HTTP 206 Partial Content` validada em todas as requisições range da CDN.

### 3.3. Normalização de Volume (EBU R128)
- Memes de internet frequentemente possuem picos agressivos de volume ("estourados").
- **Recomendação para a LiveTip:**
  - Aplicar no player de overlay um nó de ganho (`GainNode` via Web Audio API) com limitador (DynamicsCompressorNode) ou controle de volume ajustado por streamer, com teto recomendado em **-16 LUFS** para evitar clipping nos alto-falantes da live.

---

## 4. Bloco C: Documentação da API v1

### 4.1. Listar Catálogo de Sons
Recupera a lista paginada de sons disponíveis.

- **Método:** `GET`
- **Endpoint:** `/api/v1/sounds`

#### Parâmetros de Query:
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `safe_only` | `boolean` | `false` | **(Recomendado `true` para a LiveTip)** Retorna apenas sons seguros contra Content ID/DMCA. |
| `q` | `string` | - | Termo de busca textual por título ou tags. |
| `category` | `string` | `todos` | Filtro por categoria (`memes`, `efeitos`, `jogos`, `filmes`, `anime`, etc.). |
| `trending` | `boolean` | `false` | Se `true`, retorna apenas memes em alta. |
| `page` | `integer` | `1` | Número da página. |
| `limit` | `integer` | `50` | Quantidade por página (máximo: `100`). |

#### Exemplo de Requisição:
```bash
curl -X GET "https://plonkmemes.vercel.app/api/v1/sounds?safe_only=true&limit=2"
```

#### Exemplo de Resposta (200 OK):
```json
{
  "data": [
    {
      "id": "setembro-vai-entrar-o-grosso-lula-68611",
      "title": "SETEMBRO VAI ENTRAR O GROSSO ( LULA )",
      "slug": "setembro-vai-entrar-o-grosso-lula-68611",
      "audio_url": "https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/setembro-vai-entrar-o-grosso-lula-68611.mp3",
      "category": "memes",
      "duration_seconds": 2.0,
      "is_trending": true,
      "is_safe_for_streamers": true,
      "tags": ["setembro", "vai", "entrar", "grosso", "lula"]
    },
    {
      "id": "pou-estourado-48183",
      "title": "POU ESTOURADO",
      "slug": "pou-estourado-48183",
      "audio_url": "https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/pou-estourado-48183.mp3",
      "category": "efeitos",
      "duration_seconds": 2.0,
      "is_trending": true,
      "is_safe_for_streamers": true,
      "tags": ["pou", "estourado"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 2266,
    "total_pages": 1133
  }
}
```

---

### 4.2. Consultar Detalhes de um Som
Recupera os metadados e URL de áudio direta de um som específico pelo seu `id` ou `slug`.

- **Método:** `GET`
- **Endpoint:** `/api/v1/sounds/:id`

#### Exemplo de Requisição:
```bash
curl -X GET "https://plonkmemes.vercel.app/api/v1/sounds/pou-estourado-48183"
```

#### Exemplo de Resposta (200 OK):
```json
{
  "id": "pou-estourado-48183",
  "title": "POU ESTOURADO",
  "slug": "pou-estourado-48183",
  "audio_url": "https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/pou-estourado-48183.mp3",
  "category": "efeitos",
  "duration_seconds": 2.0,
  "is_trending": true,
  "is_safe_for_streamers": true,
  "tags": ["pou", "estourado"]
}
```

---

### 4.3. Feed de Depreciações e Remoções
Usado para sincronizar exclusões de catálogo na base local da LiveTip.

- **Método:** `GET`
- **Endpoint:** `/api/v1/sounds/deprecations`

#### Parâmetros de Query:
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `since` | `ISO 8601 string` | Timestamp da última verificação da LiveTip (ex.: `2026-09-01T00:00:00Z`). |

#### Exemplo de Resposta (200 OK):
```json
{
  "removed_sounds": [],
  "last_sync": "2026-09-07T18:13:46.175Z",
  "since": "2026-09-01T00:00:00Z",
  "message": "Nenhum som depreciado ou removido no período consultado."
}
```

---

## 5. Bloco D: Snippets de Implementação

### 5.1. Sincronização de Catálogo (Node.js / TypeScript)
Script de sincronização diária para ingestion no banco de dados da LiveTip:

```typescript
import axios from 'axios';

interface SoundItem {
  id: string;
  title: string;
  slug: string;
  audio_url: string;
  category: string;
  duration_seconds: number;
  is_safe_for_streamers: boolean;
  tags: string[];
}

export async function syncPlonkMemesCatalog() {
  const BASE_URL = 'https://plonkmemes.vercel.app/api/v1/sounds';
  let page = 1;
  const limit = 100;
  let hasMore = true;

  console.log('[LiveTip Sync] Iniciando sincronização segura de memes...');

  while (hasMore) {
    const response = await axios.get(BASE_URL, {
      params: {
        safe_only: true, // Garante que nenhum áudio com Content ID entre na base
        page,
        limit,
      },
      timeout: 10000,
    });

    const { data, pagination } = response.data;

    for (const sound of (data as SoundItem[])) {
      // Inserir ou atualizar na base de dados da LiveTip
      // await db.sounds.upsert({ where: { externalId: sound.id }, update: sound, create: sound });
    }

    console.log(`[LiveTip Sync] Página ${page}/${pagination.total_pages} processada.`);

    if (page >= pagination.total_pages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log('[LiveTip Sync] Sincronização concluída com sucesso.');
}
```

---

### 5.2. Player para Overlay do OBS (HTML5 / Web Audio com Zero Latency)
Código otimizado para o Browser Source do OBS Studio:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>LiveTip OBS Sound Overlay</title>
  <style>
    body { background: transparent; margin: 0; overflow: hidden; }
  </style>
</head>
<body>
  <script>
    // AudioContext com limitador para proteger o áudio da live de distorção
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Compressor/Limitador dinâmico
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(12, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

    // Controle de ganho mestre da LiveTip
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime); // 85% de volume padrão

    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    /**
     * Toca um alerta de doação instantaneamente
     * @param {string} audioUrl - URL fornecida pela API PlonkMemes
     */
    async function playTipAlert(audioUrl) {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      try {
        const response = await fetch(audioUrl, { mode: 'cors' });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(compressor);
        source.start(0);

        console.log('[LiveTip Overlay] Áudio reproduzido com sucesso!');
      } catch (err) {
        console.error('[LiveTip Overlay] Erro ao reproduzir som:', err);
        // Fallback para elemento <audio> nativo
        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';
        audio.volume = 0.85;
        audio.play();
      }
    }

    // Exemplo de recepção de evento WebSocket da LiveTip:
    // socket.on('donation', (tip) => {
    //   if (tip.sound_url) playTipAlert(tip.sound_url);
    // });
  </script>
</body>
</html>
```

---

## 6. Contatos Técnicos e Suporte de Engenharia
- **Repositório do Projeto:** `https://github.com/lnrdleao/plonkmemes`
- **Ambiente de Produção:** `https://plonkmemes.vercel.app`
- **Endpoints de Diagnóstico:**
  - Status API: `GET https://plonkmemes.vercel.app/api/v1/sounds?limit=1`
  - CDN Range Check: `curl -I -H "Range: bytes=0-1024" https://bfwdlanqfokvmxhzfdie.supabase.co/storage/v1/object/public/sounds/pou-estourado-48183.mp3`
