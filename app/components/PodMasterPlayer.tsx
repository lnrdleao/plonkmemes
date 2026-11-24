'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Battery,
  Disc,
} from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';

interface PodMasterPlayerProps {
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

export const PodMasterPlayer: React.FC<PodMasterPlayerProps> = ({
  sound,
  isPlaying,
  activeAudio,
  onTogglePlay,
  onShuffle,
  isMinimizedDefault = false,
}) => {
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const timeCurrentRef = useRef<HTMLSpanElement | null>(null);
  const timeTotalRef = useRef<HTMLSpanElement | null>(null);
  const compactFillRef = useRef<HTMLDivElement | null>(null);
  const compactTimeRef = useRef<HTMLSpanElement | null>(null);

  const durationRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMinimizedDefault);
  const [isScrubbing, setIsScrubbing] = useState(false);

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

      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${percent}%`;
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

  const accent = sound.color || '#F59E0B';

  if (isCollapsed) {
    return (
      <div
        className="mb-5 rounded-2xl border border-zinc-700/70 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg"
        style={{
          background: `linear-gradient(155deg, ${accent}25 0%, #1c1c20 45%, #111114 100%)`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onTogglePlay(sound)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md"
            style={{ backgroundColor: accent }}
            title={isPlaying ? 'Parar' : 'Tocar'}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold shrink-0">POCKET POD</span>
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
              title="Próximo som aleatório"
              className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expandir Pocket Pod"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] font-semibold text-zinc-300 cursor-pointer"
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
      className="relative mb-6 rounded-3xl p-4 sm:p-6 overflow-hidden border border-zinc-700/75 shadow-2xl"
      style={{
        background: `linear-gradient(150deg, ${accent}38 0%, #242429 35%, #151518 75%, #0c0c0f 100%)`,
        boxShadow: isPlaying
          ? `0 20px 45px -16px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.22)`
          : 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.7)',
      }}
    >
      {/* Brushed Aluminum Top Edge Specular Highlight */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-6 h-[1.5px] opacity-85 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, rgba(255,255,255,0.7), ${accent}, transparent)`,
        }}
      />

      {/* Top Corner Controls */}
      <div className="relative flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-zinc-300">
          <Disc className="w-4 h-4 text-amber-400" />
          <span>PLONK POCKET POD • MASTER</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Ativar som' : 'Mutar'}
            className="p-1.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-700/80 text-zinc-300 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-700/80 text-[11px] font-semibold text-zinc-300 cursor-pointer"
          >
            <span>Minimizar</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Pod Body: Backlit LCD Screen (Left) + 3D Interactive Click Wheel (Right) */}
      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
        {/* Backlit LCD Display */}
        <div
          className="relative rounded-2xl p-4 sm:p-5 border border-zinc-700/80 bg-[#0d1016] overflow-hidden"
          style={{
            boxShadow: isPlaying
              ? `inset 0 0 28px ${accent}30, inset 0 3px 10px rgba(0,0,0,0.9)`
              : 'inset 0 3px 10px rgba(0,0,0,0.9)',
          }}
        >
          {/* Acrylic Glass Diagonal Glare */}
          <div
            aria-hidden="true"
            className="absolute -top-10 -left-10 w-44 h-44 rotate-[24deg] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none"
          />

          {/* LCD Status Bar */}
          <div className="relative flex items-center justify-between text-[10px] font-mono text-zinc-400 pb-2.5 mb-3 border-b border-zinc-800/90">
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 animate-pulse">
                  <Volume2 className="w-3 h-3" />
                  <span>REPRODUZINDO</span>
                </span>
              ) : (
                <span className="text-zinc-500 font-semibold">PRONTO</span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase text-[9px]">
                {sound.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>{formatPlays(sound.plays)}</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Track Title */}
          <div className="relative mb-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              FAIXA SELECIONADA
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight line-clamp-1">
              {sound.title}
            </h2>
          </div>

          {/* Interactive Scrubber */}
          <div className="relative">
            <div
              ref={scrubberRef}
              onPointerDown={handlePointerScrub}
              role="slider"
              aria-label="Progresso do áudio"
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              className="h-2.5 w-full rounded-full bg-zinc-800/90 overflow-hidden cursor-ew-resize shadow-inner"
            >
              <div
                ref={progressFillRef}
                className="h-full rounded-full"
                style={{
                  width: '0%',
                  backgroundColor: accent,
                  boxShadow: `0 0 12px ${accent}`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-zinc-400">
              <span ref={timeCurrentRef} className="text-zinc-200 font-bold">0:00</span>
              <span ref={timeTotalRef}>{formatTime(sound.duration || 0)}</span>
            </div>
          </div>
        </div>

        {/* Large Interactive 3D Click Wheel */}
        <div className="flex items-center justify-center">
          <div
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-zinc-600/80 flex items-center justify-center select-none"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #34343a 0%, #1d1d22 55%, #111115 100%)',
              boxShadow: isPlaying
                ? `0 0 32px ${accent}45, inset 0 2px 4px rgba(255,255,255,0.16), inset 0 -4px 8px rgba(0,0,0,0.85)`
                : '0 10px 24px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.12), inset 0 -4px 8px rgba(0,0,0,0.8)',
            }}
          >
            {/* Top Cardinal: MENU (Collapse) */}
            <button
              type="button"
              onClick={toggleCollapse}
              title="Minimizar Pod"
              className="absolute top-2.5 px-2 py-0.5 text-[10px] font-black tracking-widest text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              MENU
            </button>

            {/* Left Cardinal: PREV / Rewind */}
            <button
              type="button"
              onClick={restart}
              title="Reiniciar áudio"
              className="absolute left-2.5 px-1.5 py-1 text-[11px] font-black tracking-tighter text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              |◀◀
            </button>

            {/* Right Cardinal: NEXT / Shuffle */}
            <button
              type="button"
              onClick={() => onShuffle?.()}
              title="Próximo som aleatório"
              className="absolute right-2.5 px-1.5 py-1 text-[11px] font-black tracking-tighter text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              ▶▶|
            </button>

            {/* Bottom Cardinal: PLAY/PAUSE */}
            <button
              type="button"
              onClick={() => onTogglePlay(sound)}
              title={isPlaying ? 'Parar' : 'Tocar'}
              className="absolute bottom-2.5 px-2 py-0.5 text-[11px] font-black tracking-tighter text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              ▶❚❚
            </button>

            {/* Concave Tactile Center Action Button */}
            <button
              type="button"
              onClick={() => onTogglePlay(sound)}
              title={isPlaying ? 'Parar áudio' : 'Tocar áudio'}
              className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isPlaying
                  ? 'text-white ring-2 ring-white/50 border-white/30'
                  : 'border-zinc-700 text-zinc-200 hover:border-zinc-500'
              }`}
              style={{
                background: isPlaying
                  ? accent
                  : 'radial-gradient(circle at 65% 70%, #2a2a30 0%, #121216 75%)',
                boxShadow: isPlaying
                  ? `0 0 18px ${accent}99`
                  : 'inset 0 3px 6px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.14)',
              }}
            >
              {isPlaying ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
