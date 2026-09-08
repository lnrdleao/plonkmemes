import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfwdlanqfokvmxhzfdie.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTM4NTcsImV4cCI6MjEwNDM2OTg1N30.uQEduoqmdNY9pErx0p8LUlJTADg_Rpg0CcNYs7QiB6E';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Cache global
let memoryStats: Record<string, number> = {};
let lastLoadedTime = 0;
let postgresTableAvailable: boolean | null = null;

// Fila de gravação para o storage para evitar colisões
let storageWriteLock = Promise.resolve();

async function persistToStorage(soundId: string): Promise<number> {
  // Enfileira na promise chain para evitar race conditions
  storageWriteLock = storageWriteLock.then(async () => {
    try {
      let currentMap: Record<string, number> = {};
      const { data: downloadData } = await supabase.storage
        .from('sounds')
        .download('stats/plays_summary.json');

      if (downloadData) {
        try {
          currentMap = JSON.parse(await downloadData.text());
        } catch {}
      }

      currentMap[soundId] = (currentMap[soundId] || 0) + 1;
      memoryStats[soundId] = currentMap[soundId];

      await supabase.storage.from('sounds').upload(
        'stats/plays_summary.json',
        Buffer.from(JSON.stringify(currentMap)),
        {
          upsert: true,
          contentType: 'application/json',
        }
      );
    } catch (err) {
      console.error('[StatsService] Erro ao gravar fallback no storage:', err);
    }
  });

  await storageWriteLock;
  return memoryStats[soundId] || 1;
}

/**
 * Registra a reprodução de um som no Supabase.
 * Usa RPC atômico no PostgreSQL se a tabela existir, ou fallback resiliente no Supabase Storage.
 */
export async function recordSoundPlay(soundId: string): Promise<number> {
  if (!soundId) return 0;

  // Atualiza cache de memória
  memoryStats[soundId] = (memoryStats[soundId] || 0) + 1;

  // 1. Tenta chamar RPC atômico no Supabase PostgreSQL
  if (postgresTableAvailable !== false) {
    try {
      const { data, error } = await supabase.rpc('increment_play', {
        sound_id_input: soundId,
      });

      if (!error && (typeof data === 'number' || typeof data === 'string')) {
        postgresTableAvailable = true;
        const count = Number(data);
        memoryStats[soundId] = count;
        return count;
      }

      if (error && (error.code === 'PGRST202' || error.code === 'PGRST205')) {
        postgresTableAvailable = false;
      }
    } catch {
      postgresTableAvailable = false;
    }
  }

  // 2. Fallback: Gravação direta no Supabase Storage
  return await persistToStorage(soundId);
}

/**
 * Retorna as estatísticas agregadas de todos os sons do PlonkMemes.
 */
export async function getSoundStats(): Promise<{
  stats: Record<string, number>;
  totalPlays: number;
}> {
  // 1. Tenta carregar do Postgres
  if (postgresTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('sound_stats')
        .select('sound_id, plays');

      if (!error && Array.isArray(data)) {
        postgresTableAvailable = true;
        const result: Record<string, number> = {};
        let total = 0;
        data.forEach((row) => {
          const p = Number(row.plays) || 0;
          result[row.sound_id] = p;
          total += p;
        });
        memoryStats = result;
        return { stats: memoryStats, totalPlays: total };
      }

      if (error && (error.code === 'PGRST205' || error.code === 'PGRST202')) {
        postgresTableAvailable = false;
      }
    } catch {
      postgresTableAvailable = false;
    }
  }

  // 2. Fallback: Carrega do Supabase Storage
  try {
    const { data: downloadData } = await supabase.storage
      .from('sounds')
      .download('stats/plays_summary.json');

    if (downloadData) {
      const parsed: Record<string, number> = JSON.parse(await downloadData.text());
      memoryStats = { ...parsed };
      const total = Object.values(memoryStats).reduce((a, b) => a + b, 0);
      return { stats: memoryStats, totalPlays: total };
    }
  } catch (err) {
    console.error('[StatsService] Falha ao ler estatísticas do Storage:', err);
  }

  const total = Object.values(memoryStats).reduce((a, b) => a + b, 0);
  return { stats: memoryStats, totalPlays: total };
}
