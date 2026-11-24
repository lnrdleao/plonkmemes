'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Play,
  Square,
  Volume2,
  VolumeX,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Waves,
  Activity,
} from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';

interface WaveMasterPlayerProps {
  sound: SoundItem | null;
  isPlaying: boolean;
  activeAudio?: HTMLAudioElement | null;
  onTogglePlay: (sound: SoundItem) => void;
  onShuffle?: () => void;
  onStopAll?: () => void;
  isMinimizedDefault?: boolean;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function generateMasterBars(seedStr: string, count = 56): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const raw = (Math.abs(hash) % 74) + 20;
    const env = 0.65 + 0.35 * Math.sin(((i + 0.5) / count) * Math.PI);
    bars.push(Math.round(Math.min(96, Math.max(16, raw * env))));
  }
  return bars;
}

export const WaveMasterPlayer: React.FC<WaveMasterPlayerProps> = ({
  sound,
  isPlaying,
  activeAudio,
  onTogglePlay,
  onShuffle,
  isMinimizedDefault = false,
}) => {
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const sweepOverlayRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const timeCurrentRef = useRef<HTMLSpanElement | null>(null);
  const timeTotalRef = useRef<HTMLSpanElement | null>(null);
  const compactFillRef = useRef<HTMLDivElement | null>(null);
  const compactTimeRef = useRef<HTMLSpanElement | null>(null);

  const durationRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMinimizedDefault);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const bars = useMemo(
    () => generateMasterBars(sound?.id || sound?.title || 'wave', 56),
    [sound?.id, sound?.title]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('memesounds_k7_collapsed');
      if (saved !== null) setIsCollapsed(saved === 'true');
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('memesounds_k7_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const updateVisuals = useCallback(
    (time: number, isExplicitEnd = false) => {
      const dur = durationRef.current || (sound?.duration ?? 0) || 1;
      const progress = isExplicitEnd
        ? 1
        : dur > 0
        ? Math.min(Math.max(time / dur, 0), 1)
        : 0;
      const percent = progress * 100;

      if (sweepOverlayRef.current) {
        sweepOverlayRef.current.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      }
      if (playheadRef.current) {
        playheadRef.current.style.left = `${percent}%`;
      }
      const displayTime = isExplicitEnd ? dur : Math.min(time, dur);
      if (timeCurrentRef.current) {
        timeCurrentRef.current.textContent = formatTime(displayTime);
      }
      if (timeTotalRef.current) {
        timeTotalRef.current.textContent = formatTime(dur);
      }
      if (compactFillRef.current) {
        compactFillRef.current.style.width = `${percent}%`;
      }
      if (compactTimeRef.current) {
        compactTimeRef.current.textContent = `${formatTime(displayTime)} / ${formatTime(dur)}`;
      }
    },
    [sound?.duration]
  );

  useEffect(() => {
    const soundDur = sound?.duration || 0;
    durationRef.current = soundDur;
    updateVisuals(0, false);
  }, [sound?.id, sound?.duration, updateVisuals]);

  useEffect(() => {
    if (!activeAudio) {
      if (!isPlaying) updateVisuals(0, false);
      return;
    }

    const updateDur = () => {
      if (activeAudio.duration && Number.isFinite(activeAudio.duration) && activeAudio.duration > 0) {
        durationRef.current = activeAudio.duration;
        if (timeTotalRef.current) timeTotalRef.current.textContent = formatTime(activeAudio.duration);
      }
    };
    updateDur();

    const onEnded = () => {
      const dur = durationRef.current || activeAudio.duration || (sound?.duration ?? 0);
      updateVisuals(dur, true);
    };

    activeAudio.addEventListener('loadedmetadata', updateDur);
    activeAudio.addEventListener('durationchange', updateDur);
    activeAudio.addEventListener('ended', onEnded);

    return () => {
      activeAudio.removeEventListener('loadedmetadata', updateDur);
      activeAudio.removeEventListener('durationchange', updateDur);
      activeAudio.removeEventListener('ended', onEnded);
    };
  }, [activeAudio, isPlaying, sound?.duration, updateVisuals]);

  useEffect(() => {
    if (!isPlaying || !activeAudio) return;
    let frameId = 0;

    function loop() {
      if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
        if (!isScrubbing) {
          const cur = activeAudio.currentTime;
          const dur =
            activeAudio.duration && Number.isFinite(activeAudio.duration) && activeAudio.duration > 0
              ? activeAudio.duration
              : durationRef.current || sound?.duration || 1;
          durationRef.current = dur;
          updateVisuals(cur, cur >= dur - 0.025);
        }
        frameId = window.requestAnimationFrame(loop);
      }
    }

    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, activeAudio, isScrubbing, sound?.duration, updateVisuals]);

  const handleSeek = (ratio: number) => {
    const dur = durationRef.current || (sound?.duration ?? 0) || 1;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const nextTime = clamped * dur;
    if (activeAudio) activeAudio.currentTime = nextTime;
    updateVisuals(nextTime, clamped >= 1);
  };

  const handlePointerScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = scrubberRef.current;
    if (!track) return;
    setIsScrubbing(true);
    const rect = track.getBoundingClientRect();
    handleSeek((e.clientX - rect.left) / rect.width);

    const onMove = (ev: PointerEvent) => handleSeek((ev.clientX - rect.left) / rect.width);
    const onUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const restart = () => {
    if (!sound) return;
    if (isPlaying && activeAudio) {
      activeAudio.currentTime = 0;
      updateVisuals(0, false);
    } else {
      updateVisuals(0, false);
      onTogglePlay(sound);
    }
  };

  const toggleMute = () => {
    if (activeAudio) {
      activeAudio.muted = !activeAudio.muted;
      setIsMuted(activeAudio.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  if (!sound) return null;

  const accent = sound.color || '#10B981';

  if (isCollapsed) {
    return (
      <div className="mb-5 rounded-2xl bg-[linear-gradient(160deg,#18181b_0%,#111113_100%)] border border-zinc-800/90 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onTogglePlay(sound)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: accent }}
            title={isPlaying ? 'Parar' : 'Tocar'}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold shrink-0">WAVE DECK</span>
              <p className="text-xs font-bold text-zinc-100 truncate">{sound.title}</p>
            </div>
            <div className="mt-1.5 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div ref={compactFillRef} className="h-full rounded-full" style={{ width: '0%', backgroundColor: accent }} />
            </div>
          </div>
          <span ref={compactTimeRef} className="hidden sm:inline font-mono text-[10px] text-zinc-400 shrink-0">
            0:00 / {formatTime(sound.duration || 0)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onShuffle && (
            <button
              type="button"
              onClick={onShuffle}
              title="Som aleatório"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expandir Wave Deck"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300 cursor-pointer"
          >
            <span>Expandir</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      className="relative mb-6 rounded-2xl p-4 sm:p-5 overflow-hidden border border-zinc-800/90 bg-[linear-gradient(160deg,#18181c_0%,#101013_60%,#0b0b0d_100%)] shadow-2xl"
      style={{
        boxShadow: isPlaying ? `0 20px 50px -20px ${accent}45` : undefined,
      }}
    >
      {/* Top Neon Hardware Line */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[2px] opacity-80 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Ambient Glow */}
      <div
        aria-hidden="true"
        className={`absolute -right-12 -top-12 w-56 h-56 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
          isPlaying ? 'opacity-20' : 'opacity-5'
        }`}
        style={{ backgroundColor: accent }}
      />

      {/* Top Row: Studio Metadata & Collapse */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-700/80 bg-zinc-900 shrink-0"
            style={{ boxShadow: isPlaying ? `0 0 16px ${accent}55` : undefined }}
          >
            <Waves className="w-4 h-4" style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                <Activity className={`w-3 h-3 ${isPlaying ? 'animate-spin' : ''}`} />
                WAVE STUDIO DECK
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                {sound.category}
              </span>
              {sound.loudness?.integrated_lufs && (
                <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {sound.loudness.integrated_lufs.toFixed(1)} LUFS
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {formatPlays(sound.plays)}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              {sound.title}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <span>Minimizar</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Interactive 56-bar Acoustic Waveform Scrubber */}
      <div
        ref={scrubberRef}
        onPointerDown={handlePointerScrub}
        role="slider"
        aria-label="Linha do tempo do áudio"
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        className="relative h-20 sm:h-24 w-full rounded-xl bg-zinc-950/95 border border-zinc-800/90 px-3 py-2.5 cursor-ew-resize overflow-hidden shadow-[inset_0_3px_10px_rgba(0,0,0,0.85)] select-none"
      >
        {/* Base dim waveform */}
        <div className="w-full h-full flex items-center justify-between gap-[3px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full opacity-30"
              style={{ height: `${h}%`, backgroundColor: accent }}
            />
          ))}
        </div>

        {/* Highlighted played waveform */}
        <div
          ref={sweepOverlayRef}
          className="absolute inset-0 px-3 py-2.5 flex items-center justify-between gap-[3px] pointer-events-none"
          style={{ clipPath: 'inset(0 100% 0 0)' }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${h}%`,
                backgroundColor: accent,
                boxShadow: `0 0 8px ${accent}88`,
              }}
            />
          ))}
        </div>

        {/* Glowing Playhead Needle */}
        <div
          ref={playheadRef}
          aria-hidden="true"
          className="absolute top-1 bottom-1 w-[2px] rounded-full bg-white shadow-[0_0_10px_#fff] pointer-events-none"
          style={{ left: '0%' }}
        />
      </div>

      {/* Bottom Transport Controls */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span ref={timeCurrentRef} className="text-zinc-100 font-bold">0:00</span>
          <span>/</span>
          <span ref={timeTotalRef}>{formatTime(sound.duration || 0)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={restart}
            title="Reiniciar"
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onTogglePlay(sound)}
            title={isPlaying ? 'Parar' : 'Tocar'}
            className="px-5 h-10 rounded-full text-white font-black text-xs tracking-wider uppercase flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
            style={{
              backgroundColor: accent,
              boxShadow: `0 6px 20px -4px ${accent}90`,
            }}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>PARAR</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>TOCAR</span>
              </>
            )}
          </button>

          {onShuffle && (
            <button
              type="button"
              onClick={onShuffle}
              title="Próximo som aleatório"
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Ativar som' : 'Mutar'}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </section>
  );
};
