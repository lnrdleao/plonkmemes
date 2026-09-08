-- ==============================================================================
-- PLONKMEMES: Persistent Play Counts & Live Trending Statistics
-- ==============================================================================

-- 1. Tabela de Estatísticas Globais de Reprodução
CREATE TABLE IF NOT EXISTS public.sound_stats (
    sound_id TEXT PRIMARY KEY,
    plays BIGINT NOT NULL DEFAULT 1,
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE public.sound_stats ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública de estatísticas
DROP POLICY IF EXISTS "Allow public read access" ON public.sound_stats;
CREATE POLICY "Allow public read access" 
ON public.sound_stats FOR SELECT 
USING (true);

-- Permite gravação/atualização pelo serviço e anon
DROP POLICY IF EXISTS "Allow service write access" ON public.sound_stats;
CREATE POLICY "Allow service write access" 
ON public.sound_stats FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Função Atômica RPC para incrementar plays sem conflito de concorrência
CREATE OR REPLACE FUNCTION public.increment_play(sound_id_input TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_plays BIGINT;
BEGIN
    INSERT INTO public.sound_stats (sound_id, plays, last_played_at)
    VALUES (sound_id_input, 1, NOW())
    ON CONFLICT (sound_id)
    DO UPDATE SET 
        plays = public.sound_stats.plays + 1,
        last_played_at = NOW()
    RETURNING plays INTO new_plays;
    
    RETURN new_plays;
END;
$$;

-- 4. Conceder permissão de execução da função
GRANT EXECUTE ON FUNCTION public.increment_play(TEXT) TO anon, authenticated, service_role;

-- 5. Índice para consultas rápidas de tendências
CREATE INDEX IF NOT EXISTS idx_sound_stats_plays ON public.sound_stats (plays DESC);
CREATE INDEX IF NOT EXISTS idx_sound_stats_last_played ON public.sound_stats (last_played_at DESC);
