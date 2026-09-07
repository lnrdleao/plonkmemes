'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  Plus,
  Flame,
  Sparkles,
  Zap,
  Disc3,
  Waves,
  Heart,
  Gamepad2,
  Tv,
  Mic,
  Music,
  MessageSquare,
} from 'lucide-react';
import { SoundItem, CategoryFilter, ViewMode } from './types';
import { INITIAL_SOUNDS } from './data/initial-sounds';
import { CassetteTape } from './components/CassetteTape';
import { WaveCapsule } from './components/WaveCapsule';
import { UploadModal } from './components/UploadModal';

export default function HomePage() {
  // State: Sounds catalog with lazy initialization from localStorage
  const [sounds, setSounds] = useState<SoundItem[]>(INITIAL_SOUNDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter | 'favoritos'>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('cassette');
  const [chaosMode, setChaosMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activePlayingIds, setActivePlayingIds] = useState<string[]>([]);

  // Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  // Audio references
  const activeAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Hydrate local data on mount without synchronous set-state issues
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem('memesounds_custom');
      if (savedCustom) {
        const parsed: SoundItem[] = JSON.parse(savedCustom);
        setSounds((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newItems = parsed.filter((p) => !existingIds.has(p.id));
          return newItems.length > 0 ? [...newItems, ...prev] : prev;
        });
      }
      const savedFavs = localStorage.getItem('memesounds_favs');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      const savedView = localStorage.getItem('memesounds_view');
      if (savedView === 'waveform' || savedView === 'cassette') {
        setViewMode(savedView);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const toggleFavorite = (soundId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(soundId)
        ? prev.filter((id) => id !== soundId)
        : [...prev, soundId];
      try {
        localStorage.setItem('memesounds_favs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const playSound = (sound: SoundItem) => {
    if (!chaosMode) {
      activeAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAudiosRef.current.clear();
      setActivePlayingIds([]);
    }

    const existing = activeAudiosRef.current.get(sound.id);
    if (existing && !chaosMode) {
      existing.pause();
      existing.currentTime = 0;
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
      return;
    }

    const audio = new Audio(sound.audioUrl);
    activeAudiosRef.current.set(sound.id, audio);
    setActivePlayingIds((prev) => [...prev, sound.id]);

    setSounds((prev) =>
      prev.map((s) => (s.id === sound.id ? { ...s, plays: s.plays + 1 } : s))
    );

    audio.play().catch((err) => {
      console.error('Falha ao reproduzir áudio:', err);
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
    });

    audio.onended = () => {
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
    };
  };

  const stopAllSounds = () => {
    activeAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudiosRef.current.clear();
    setActivePlayingIds([]);
  };

  const handleUploadSuccess = (newSound: SoundItem) => {
    setSounds((prev) => [newSound, ...prev]);
    try {
      const saved = localStorage.getItem('memesounds_custom');
      const customList = saved ? JSON.parse(saved) : [];
      localStorage.setItem('memesounds_custom', JSON.stringify([newSound, ...customList]));
    } catch {}
  };

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {
      todos: sounds.length,
      'em-alta': 0,
      memes: 0,
      games: 0,
      'tv-filmes': 0,
      efeitos: 0,
      streamers: 0,
      musica: 0,
      bordoes: 0,
    };
    sounds.forEach((s) => {
      if (s.isTrending) c['em-alta']++;
      if (c[s.category] !== undefined) {
        c[s.category]++;
      }
    });
    return c;
  }, [sounds]);

  const filteredSounds = useMemo(() => {
    return sounds.filter((item) => {
      if (selectedCategory === 'favoritos') {
        if (!favorites.includes(item.id)) return false;
      } else if (selectedCategory === 'em-alta') {
        if (!item.isTrending) return false;
      } else if (selectedCategory !== 'todos' && item.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        return matchesTitle || matchesTags;
      }

      return true;
    });
  }, [sounds, selectedCategory, favorites, searchQuery]);

  // Reset pagination when searching or changing category
  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, selectedCategory]);

  const displayedSounds = useMemo(() => {
    return filteredSounds.slice(0, visibleCount);
  }, [filteredSounds, visibleCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-rose-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-950 border-b border-zinc-800/60 px-4 py-1.5 text-center text-xs text-zinc-400">
        <span className="font-semibold text-rose-400 mr-1.5">⚡ PlonkMemes:</span>
        A soundboard definitiva de memes, virais e efeitos sonoros.
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/20">
                <Disc3 className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  PLONKMEMES
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    MEMES
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">
                  A soundboard definitiva de memes, virais e efeitos sonoros.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Subir Novo Som</span>
            </button>
          </div>
        </header>

        {/* Controls */}
        <section className="my-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar som por nome ou tag (ex: faro, chaves, calmo, bill, gol)..."
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Object Selector */}
              <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  onClick={() => {
                    setViewMode('cassette');
                    localStorage.setItem('memesounds_view', 'cassette');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'cassette'
                      ? 'bg-zinc-800 text-rose-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Objeto Fita Cassete com bobinas giratórias"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Fita Cassete</span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('waveform');
                    localStorage.setItem('memesounds_view', 'waveform');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'waveform'
                      ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Objeto Cápsula com barras de equalizador acústico"
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>Cápsula Wave</span>
                </button>
              </div>

              {/* Chaos Mode Toggle */}
              <button
                onClick={() => setChaosMode(!chaosMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  chaosMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title={chaosMode ? 'Modo Caos ativo: múltiplos sons tocam juntos' : 'Modo Solo: toca um som de cada vez'}
              >
                <Zap className={`w-3.5 h-3.5 ${chaosMode ? 'text-amber-400 fill-amber-400' : ''}`} />
                <span>{chaosMode ? 'Modo Caos (DJ)' : 'Modo Solo'}</span>
              </button>

              {/* Stop All Button */}
              {activePlayingIds.length > 0 && (
                <button
                  onClick={stopAllSounds}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all animate-pulse cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Parar Tudo ({activePlayingIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategory('em-alta')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'em-alta'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900 text-amber-400 hover:bg-zinc-800 hover:text-amber-300 border border-amber-500/30'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${selectedCategory === 'em-alta' ? 'fill-zinc-950 text-zinc-950' : 'fill-amber-400 text-amber-400'}`} />
              <span>Em Alta ({categoryCounts['em-alta']})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'todos'
                  ? 'bg-zinc-100 text-zinc-900 font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              ✨ Todos ({categoryCounts.todos})
            </button>

            <button
              onClick={() => setSelectedCategory('memes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'memes'
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Memes ({categoryCounts.memes})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('games')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'games'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Games ({categoryCounts.games})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('tv-filmes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'tv-filmes'
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>TV & Filmes ({categoryCounts['tv-filmes']})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('efeitos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'efeitos'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>Efeitos ({categoryCounts.efeitos})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('streamers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'streamers'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>Streamers ({categoryCounts.streamers})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('musica')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'musica'
                  ? 'bg-pink-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Música ({categoryCounts.musica})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('bordoes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'bordoes'
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Bordões ({categoryCounts.bordoes})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('favoritos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'favoritos'
                  ? 'bg-rose-500 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Heart className={`w-3 h-3 ${favorites.length > 0 ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>Favoritos ({favorites.length})</span>
            </button>
          </div>
        </section>

        {/* Grid */}
        {filteredSounds.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <VolumeX className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-200">Nenhum som encontrado</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Não encontramos nenhum áudio para &quot;{searchQuery}&quot;. Você pode subir este som agora mesmo!
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg cursor-pointer"
            >
              Subir este som agora
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {displayedSounds.map((sound) => {
                const isPlaying = activePlayingIds.includes(sound.id);
                const isFav = favorites.includes(sound.id);

                return viewMode === 'cassette' ? (
                  <CassetteTape
                    key={sound.id}
                    sound={sound}
                    isPlaying={isPlaying}
                    onPlay={playSound}
                    isFavorite={isFav}
                    onToggleFavorite={toggleFavorite}
                  />
                ) : (
                  <WaveCapsule
                    key={sound.id}
                    sound={sound}
                    isPlaying={isPlaying}
                    onPlay={playSound}
                    isFavorite={isFav}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>

            {/* Load More Button */}
            {visibleCount < filteredSounds.length && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 40)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-zinc-700 shadow-md cursor-pointer transition-all"
                >
                  Carregar mais sons ({filteredSounds.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-zinc-900 text-center text-xs text-zinc-600 space-y-1 pb-10">
          <p>
            PlonkMemes • Feito com foco 100% no som, performance e memes virais.
          </p>
          <p className="text-[11px] text-zinc-700">
            Dica: No modo Caos (DJ), você pode clicar em vários sons rápidos para sobrepor os áudios.
          </p>
        </footer>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
