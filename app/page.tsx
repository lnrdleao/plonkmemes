'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Volume2,
  Volume1,
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
  Disc,
  LogOut,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Keyboard,
} from 'lucide-react';
import { SoundItem, CategoryFilter, ViewMode } from './types';
import { INITIAL_SOUNDS } from './data/initial-sounds';
import { CassetteTape } from './components/CassetteTape';
import { CassettePlayer } from './components/CassettePlayer';
import { WaveCapsule } from './components/WaveCapsule';
import { WaveMasterPlayer } from './components/WaveMasterPlayer';
import { PocketPlayer } from './components/PocketPlayer';
import { PodMasterPlayer } from './components/PodMasterPlayer';
import { UploadModal } from './components/UploadModal';
import { supabase } from './lib/supabaseClient';
import { formatPlays } from './lib/formatters';

type SortOption = 'default' | 'most-played' | 'short' | 'alpha';

export default function HomePage() {
  // State: Sounds catalog with lazy initialization from localStorage
  const [sounds, setSounds] = useState<SoundItem[]>(INITIAL_SOUNDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter | 'favoritos' | 'recentes'>('em-alta');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('cassette');
  const [chaosMode, setChaosMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(1);
  const [activePlayingIds, setActivePlayingIds] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [totalPlatformPlays, setTotalPlatformPlays] = useState<number>(0);
  const [deckSound, setDeckSound] = useState<SoundItem | null>(null);
  const [activeMasterAudio, setActiveMasterAudio] = useState<HTMLAudioElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastPlaySentRef = useRef<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  // Audio references
  const activeAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2400);
  }, []);

  // Hydrate local data on mount without synchronous set-state issues
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem('memesounds_custom');
      if (savedCustom) {
        const parsed: SoundItem[] = JSON.parse(savedCustom);
        // Expulsa imediatamente 'Mix 1mq8s' ou variações enviadas
        const cleaned = parsed.filter((p) => {
          const t = (p.title || '').toLowerCase();
          const s = (p.slug || '').toLowerCase();
          const sid = (p.id || '').toLowerCase();
          const isTarget =
            t.includes('1mq8') ||
            t.includes('1m08') ||
            t.includes('1m48') ||
            (t.includes('mix') && t.includes('1m')) ||
            s.includes('1mq8') ||
            s.includes('1m08') ||
            s.includes('1m48') ||
            sid.includes('1mq8');
          return !isTarget;
        });

        if (cleaned.length !== parsed.length) {
          localStorage.setItem('memesounds_custom', JSON.stringify(cleaned));
        }

        setSounds((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newItems = cleaned.filter((p) => !existingIds.has(p.id));
          return newItems.length > 0 ? [...newItems, ...prev] : prev;
        });
      }
      const savedFavs = localStorage.getItem('memesounds_favs');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      const savedRecent = localStorage.getItem('memesounds_recent');
      if (savedRecent) {
        setRecentIds(JSON.parse(savedRecent));
      }
      const savedVol = localStorage.getItem('memesounds_volume');
      if (savedVol !== null) {
        const parsedVol = parseFloat(savedVol);
        if (!Number.isNaN(parsedVol) && parsedVol >= 0 && parsedVol <= 1) {
          setMasterVolume(parsedVol);
        }
      }
      const savedView = localStorage.getItem('memesounds_view');
      if (savedView === 'waveform' || savedView === 'cassette' || savedView === 'pocket') {
        setViewMode(savedView);
      }

      // Suporte a deep-links de SEO (sitemap) e compartilhamento (?sound=, ?cat=, ?q=, #id)
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('cat');
      const qParam = params.get('q');
      const soundParam = params.get('sound') || window.location.hash.replace(/^#/, '');

      const validCategories = [
        'todos',
        'em-alta',
        'memes',
        'games',
        'tv-filmes',
        'efeitos',
        'streamers',
        'musica',
        'bordoes',
        'favoritos',
        'recentes',
      ];
      if (catParam && validCategories.includes(catParam)) {
        setSelectedCategory(catParam as CategoryFilter | 'favoritos' | 'recentes');
      }
      if (qParam) {
        setSearchQuery(qParam);
        if (!catParam) setSelectedCategory('todos');
      }
      if (soundParam) {
        const decoded = decodeURIComponent(soundParam);
        const matched = INITIAL_SOUNDS.find(
          (s) => s.id === decoded || s.slug === decoded
        );
        if (matched) {
          setDeckSound(matched);
          setSelectedCategory('todos');
          setSearchQuery(matched.title);
        }
      }
    } catch {
      // ignore parse errors
    }

    // Carrega estatísticas globais de plays persistidas no Supabase
    fetch('/api/v1/sounds/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.stats) {
          if (typeof data.totalPlays === 'number') {
            setTotalPlatformPlays(data.totalPlays);
          }
          setSounds((prev) =>
            prev.map((s) => ({
              ...s,
              plays: data.stats[s.id] !== undefined ? data.stats[s.id] : s.plays,
            }))
          );
        }
      })
      .catch((err) => console.warn('Não foi possível carregar estatísticas:', err));

    // Assinatura de autenticação do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginGoogle = async () => {
    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://plonkmemes.lol';

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
    } catch (err) {
      console.error('Erro ao conectar com Google:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.min(Math.max(newVol, 0), 1);
    setMasterVolume(clamped);
    activeAudiosRef.current.forEach((audio) => {
      audio.volume = clamped;
    });
    try {
      localStorage.setItem('memesounds_volume', String(clamped));
    } catch {}
  };

  const toggleFavorite = (soundId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(soundId);
      const next = exists
        ? prev.filter((id) => id !== soundId)
        : [...prev, soundId];
      try {
        localStorage.setItem('memesounds_favs', JSON.stringify(next));
      } catch {}
      showToast(exists ? 'Removido dos Favoritos' : 'Adicionado aos Favoritos ❤️');
      return next;
    });
  };

  // Carrega automaticamente o primeiro som viral ou topo no Deck K7
  useEffect(() => {
    if (!deckSound && sounds.length > 0) {
      const initial = sounds.find((s) => s.isTrending) || sounds[0];
      setDeckSound(initial);
    }
  }, [sounds, deckSound]);

  const playSound = (sound: SoundItem) => {
    // 1. Se o som já estiver tocando, interrompe imediatamente
    const existing = activeAudiosRef.current.get(sound.id);
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
      if (deckSound?.id === sound.id) {
        setActiveMasterAudio(null);
      }
      return;
    }

    // 2. Se não estiver no Modo Caos, interrompe outros sons ativos
    if (!chaosMode) {
      activeAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAudiosRef.current.clear();
      setActivePlayingIds([]);
      setActiveMasterAudio(null);
    }

    // 3. Cria e reproduz o áudio IMEDIATAMENTE (no contexto de clique do usuário)
    const audio = new Audio(sound.audioUrl);
    audio.volume = masterVolume;
    activeAudiosRef.current.set(sound.id, audio);
    setActivePlayingIds((prev) => (chaosMode ? [...prev, sound.id] : [sound.id]));
    setDeckSound(sound);
    setActiveMasterAudio(audio);

    // Salva nos Recentes (últimos 20)
    setRecentIds((prev) => {
      const next = [sound.id, ...prev.filter((id) => id !== sound.id)].slice(0, 20);
      try {
        localStorage.setItem('memesounds_recent', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Atualização otimista imediata na UI (0ms de latência)
    setSounds((prev) =>
      prev.map((s) => (s.id === sound.id ? { ...s, plays: s.plays + 1 } : s))
    );
    setTotalPlatformPlays((prev) => prev + 1);

    // Persistência assíncrona no Supabase com proteção anti-flood (máx 1 envio a cada 3s por som)
    const now = Date.now();
    const lastSent = lastPlaySentRef.current[sound.id] || 0;
    if (now - lastSent > 3000) {
      lastPlaySentRef.current[sound.id] = now;
      try {
        fetch(`/api/v1/sounds/${sound.id}/play`, {
          method: 'POST',
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }

    audio.play().catch((err) => {
      console.error('Falha ao reproduzir áudio:', err);
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
      setActiveMasterAudio((prev) => (prev === audio ? null : prev));
    });

    audio.onended = () => {
      activeAudiosRef.current.delete(sound.id);
      setActivePlayingIds((prev) => prev.filter((id) => id !== sound.id));
    };
  };

  const handleShuffleTape = () => {
    const pool = filteredSounds.length > 0 ? filteredSounds : sounds;
    if (pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const randomSound = pool[randomIndex];
    playSound(randomSound);
  };

  const stopAllSounds = () => {
    activeAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudiosRef.current.clear();
    setActivePlayingIds([]);
    setActiveMasterAudio(null);
  };

  const handleUploadSuccess = (newSound: SoundItem) => {
    setSounds((prev) => [newSound, ...prev]);
    try {
      const saved = localStorage.getItem('memesounds_custom');
      const customList = saved ? JSON.parse(saved) : [];
      localStorage.setItem('memesounds_custom', JSON.stringify([newSound, ...customList]));
    } catch {}
  };

  const handleDeleteCustomSound = (soundId: string) => {
    // Interrompe áudio caso esteja em reprodução
    const active = activeAudiosRef.current.get(soundId);
    if (active) {
      active.pause();
      activeAudiosRef.current.delete(soundId);
      setActivePlayingIds((prev) => prev.filter((id) => id !== soundId));
    }

    setSounds((prev) => prev.filter((s) => s.id !== soundId));
    try {
      const saved = localStorage.getItem('memesounds_custom');
      if (saved) {
        const list: SoundItem[] = JSON.parse(saved);
        const updated = list.filter((s) => s.id !== soundId);
        localStorage.setItem('memesounds_custom', JSON.stringify(updated));
      }
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
      if (s.isTrending || s.plays > 0) c['em-alta']++;
      if (c[s.category] !== undefined) {
        c[s.category]++;
      }
    });
    return c;
  }, [sounds]);

  const filteredSounds = useMemo(() => {
    let result: SoundItem[];

    if (selectedCategory === 'recentes') {
      const soundMap = new Map(sounds.map((s) => [s.id, s]));
      result = recentIds
        .map((id) => soundMap.get(id))
        .filter((s): s is SoundItem => Boolean(s));
    } else {
      result = sounds.filter((item) => {
        if (selectedCategory === 'favoritos') {
          if (!favorites.includes(item.id)) return false;
        } else if (selectedCategory === 'em-alta') {
          if (!item.isTrending && (!item.plays || item.plays <= 0)) return false;
        } else if (selectedCategory !== 'todos' && item.category !== selectedCategory) {
          return false;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        return matchesTitle || matchesTags;
      });
    }

    if (sortBy === 'short') {
      result = result
        .filter((item) => (item.duration ?? 99) <= 3.5)
        .sort((a, b) => (a.duration ?? 99) - (b.duration ?? 99));
    } else if (sortBy === 'most-played') {
      result = [...result].sort((a, b) => (b.plays || 0) - (a.plays || 0));
    } else if (sortBy === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    }

    // Se estiver na aba 'em-alta' (ordem padrão), atribui o ranking oficial (1, 2, 3...)
    if (selectedCategory === 'em-alta' && sortBy === 'default') {
      result = result.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    }

    return result;
  }, [sounds, selectedCategory, favorites, recentIds, searchQuery, sortBy]);

  // Reset pagination when searching, sorting or changing category
  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, selectedCategory, sortBy]);

  const displayedSounds = useMemo(() => {
    return filteredSounds.slice(0, visibleCount);
  }, [filteredSounds, visibleCount]);

  // Infinite scroll automático via IntersectionObserver
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    if (visibleCount >= filteredSounds.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 40, filteredSounds.length));
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredSounds.length]);

  // Atalhos globais de teclado (1-9, /, Ctrl+K, ESC, Espaço)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUploadOpen) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Ctrl+K / Cmd+K ou '/' foca a busca
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (!isTyping && e.key === '/')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // ESC: se estiver digitando limpa/desfoca; senão Panic Stop
      if (e.key === 'Escape') {
        if (isTyping) {
          if (searchQuery) setSearchQuery('');
          (target as HTMLInputElement).blur();
        } else if (activeAudiosRef.current.size > 0) {
          stopAllSounds();
          showToast('Todos os sons interrompidos (ESC)');
        }
        return;
      }

      if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return;

      // Teclas 1-9 disparam os 9 primeiros sons visíveis
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const sound = displayedSounds[idx];
        if (sound) {
          e.preventDefault();
          playSound(sound);
        }
        return;
      }

      // Espaço fora de botões toca/pausa o som do deck principal
      if (e.key === ' ' && target?.tagName !== 'BUTTON' && target?.getAttribute('role') !== 'button') {
        if (deckSound) {
          e.preventDefault();
          playSound(deckSound);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-rose-500 selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        {/* Compact Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
              <Disc3 className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                PLONKMEMES
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {sounds.length.toLocaleString('pt-BR')} SONS
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                A soundboard definitiva de memes, virais e efeitos sonoros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="hidden xl:flex items-center gap-1.5 text-[11px] text-zinc-500 bg-zinc-900/70 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl"
              title="Atalhos de teclado: 1-9 tocam sons, / busca, ESC para tudo, Espaço toca o deck"
            >
              <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">1-9</kbd>
              <span>tocar</span>
              <span className="text-zinc-700">•</span>
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">/</kbd>
              <span>buscar</span>
              <span className="text-zinc-700">•</span>
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">ESC</kbd>
              <span>parar</span>
            </div>
            {user ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-zinc-300 max-w-[110px] truncate">
                  {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  title="Sair da conta"
                  className="ml-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLoginGoogle}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Entrar</span>
              </button>
            )}

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Subir Novo Som</span>
            </button>
          </div>
        </header>
      </div>

      {/* Sticky Command Dock */}
      <div className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-y border-zinc-800/80 shadow-lg shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xl">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar som por nome ou tag (ex: faro, chaves, aura, gol)..."
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-16 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
              />
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Limpar
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-3 top-2 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/80 text-[10px] font-mono text-zinc-400 pointer-events-none">
                  /
                </kbd>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Master Volume Slider */}
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                title={`Volume Master: ${Math.round(masterVolume * 100)}%`}
              >
                <button
                  type="button"
                  onClick={() => handleVolumeChange(masterVolume > 0 ? 0 : 1)}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                  aria-label="Alternar mudo"
                >
                  {masterVolume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : masterVolume < 0.5 ? (
                    <Volume1 className="w-3.5 h-3.5 text-zinc-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={masterVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Volume Master"
                  className="w-16 sm:w-20 accent-rose-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-[10px] text-zinc-400 w-7 text-right">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>

              {/* Object Selector */}
              <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  onClick={() => {
                    setViewMode('cassette');
                    localStorage.setItem('memesounds_view', 'cassette');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'cassette'
                      ? 'bg-zinc-800 text-rose-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Objeto Fita Cassete com bobinas giratórias"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cassete</span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('waveform');
                    localStorage.setItem('memesounds_view', 'waveform');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'waveform'
                      ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Objeto Cápsula com barras de equalizador acústico"
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Wave</span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('pocket');
                    localStorage.setItem('memesounds_view', 'pocket');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'pocket'
                      ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Objeto Retrô Pod em alumínio colorido com Click Wheel tátil"
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pod</span>
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
                <span>{chaosMode ? 'Caos (DJ)' : 'Solo'}</span>
              </button>

              {/* Stop All Button (Panic Stop) */}
              {activePlayingIds.length > 0 && (
                <button
                  onClick={stopAllSounds}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                  title="Parar todos os sons (tecla ESC)"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Parar ({activePlayingIds.length})</span>
                  <kbd className="hidden sm:inline text-[9px] font-mono px-1 rounded bg-red-950/80 text-red-300">ESC</kbd>
                </button>
              )}
            </div>
          </div>

          {/* Categories + Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
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

            <button
              onClick={() => setSelectedCategory('recentes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'recentes'
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Recentes ({recentIds.length})</span>
            </button>
            </div>

            {/* Compact Sort Selector */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Ordenar sons"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="default">Padrão / Ranking</option>
                <option value="most-played">Mais Tocados</option>
                <option value="short">Curtos (&le; 3.5s)</option>
                <option value="alpha">Ordem A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
        {/* Master Hero Player matched to active skin (Cassete / Wave / Pod) */}
        {deckSound && viewMode === 'cassette' && (
          <CassettePlayer
            sound={deckSound}
            isPlaying={activePlayingIds.includes(deckSound.id)}
            activeAudio={activeMasterAudio}
            onTogglePlay={playSound}
            onShuffle={handleShuffleTape}
            onStopAll={stopAllSounds}
            isMinimizedDefault={false}
          />
        )}
        {deckSound && viewMode === 'waveform' && (
          <WaveMasterPlayer
            sound={deckSound}
            isPlaying={activePlayingIds.includes(deckSound.id)}
            activeAudio={activeMasterAudio}
            onTogglePlay={playSound}
            onShuffle={handleShuffleTape}
            onStopAll={stopAllSounds}
            isMinimizedDefault={false}
          />
        )}
        {deckSound && viewMode === 'pocket' && (
          <PodMasterPlayer
            sound={deckSound}
            isPlaying={activePlayingIds.includes(deckSound.id)}
            activeAudio={activeMasterAudio}
            onTogglePlay={playSound}
            onShuffle={handleShuffleTape}
            onStopAll={stopAllSounds}
            isMinimizedDefault={false}
          />
        )}

        {/* Compact Trending Live Bar */}
        {selectedCategory === 'em-alta' && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900/60 border border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <h2 className="text-xs font-black tracking-tight text-amber-200 flex items-center gap-2">
                EM ALTA NO BRASIL • TOP MEMES
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  AO VIVO
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Plays na plataforma:</span>
              <strong className="text-amber-300 font-mono font-bold">
                {formatPlays(totalPlatformPlays)}
              </strong>
            </div>
          </div>
        )}

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
              {displayedSounds.map((sound, idx) => {
                const isPlaying = activePlayingIds.includes(sound.id);
                const isFav = favorites.includes(sound.id);
                const hotkey = idx < 9 ? idx + 1 : undefined;

                if (viewMode === 'cassette') {
                  return (
                    <CassetteTape
                      key={sound.id}
                      sound={sound}
                      isPlaying={isPlaying}
                      onPlay={playSound}
                      isFavorite={isFav}
                      onToggleFavorite={toggleFavorite}
                      onDelete={handleDeleteCustomSound}
                      hotkey={hotkey}
                      onNotify={showToast}
                    />
                  );
                } else if (viewMode === 'waveform') {
                  return (
                    <WaveCapsule
                      key={sound.id}
                      sound={sound}
                      isPlaying={isPlaying}
                      onPlay={playSound}
                      isFavorite={isFav}
                      onToggleFavorite={toggleFavorite}
                      onDelete={handleDeleteCustomSound}
                      hotkey={hotkey}
                      onNotify={showToast}
                    />
                  );
                } else {
                  return (
                    <PocketPlayer
                      key={sound.id}
                      sound={sound}
                      isPlaying={isPlaying}
                      onPlay={playSound}
                      isFavorite={isFav}
                      onToggleFavorite={toggleFavorite}
                      onDelete={handleDeleteCustomSound}
                      hotkey={hotkey}
                      onNotify={showToast}
                    />
                  );
                }
              })}
            </div>

            {/* Infinite Scroll Sentinel & Fallback Load More */}
            {visibleCount < filteredSounds.length && (
              <div ref={loadMoreRef} className="flex justify-center mt-10">
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
        user={user}
        onLoginGoogle={handleLoginGoogle}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 plonk-toast-in px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700/80 text-xs font-semibold text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-md flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
