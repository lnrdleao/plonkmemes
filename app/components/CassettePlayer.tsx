'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Flame,
  Radio,
} from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';

const REEL_SPOKES = [0, 60, 120, 180, 240, 300] as const;
const TAPE_WINDOW_DIVIDERS = [0, 1, 2, 3, 4] as const;
const MIN_REWIND_DURATION = 240;
const MAX_REWIND_DURATION = 950;

const CASSETTE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BUTTON_CLASSES =
  'grid aspect-square cursor-pointer place-items-center rounded-full border text-[#fdfdfc] transition-all duration-150 ease-out active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-40 select-none';

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

function Screw({ className = '' }: { className?: string }) {
  const slotClasses =
    'absolute top-1/2 right-[18%] left-[18%] h-[14%] -translate-y-1/2 rounded-full bg-[#1d1d1b] shadow-[inset_0_1px_1px_rgba(0,0,0,0.85),0_1px_rgba(255,255,255,0.12)]';

  return (
    <div
      aria-hidden="true"
      className={`absolute z-20 aspect-square w-[3.3%] rounded-full border border-[#060606] bg-[radial-gradient(circle_at_36%_30%,#666663,#333330_48%,#171716_78%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_1px_1px_rgba(0,0,0,0.45)] pointer-events-none ${className}`}
    >
      <span className={`${slotClasses} rotate-45`} />
      <span className={`${slotClasses} -rotate-45`} />
    </div>
  );
}

function Reel({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute top-1/2 z-20 aspect-square w-[76cqh] -translate-x-1/2 -translate-y-1/2 pointer-events-none ${className}`}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 origin-center rotate-[var(--reel-rotation,0deg)] rounded-full will-change-transform motion-reduce:!rotate-0"
        viewBox="0 0 100 100"
      >
        <circle className="fill-[#1a1917]" cx="50" cy="50" r="48" />
        {REEL_SPOKES.map((spokeRotation) => (
          <path
            className="fill-[#242320] stroke-[#0a0a09] [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.35))] [stroke-linejoin:round] [stroke-width:1.3]"
            d="M46 3h8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"
            key={spokeRotation}
            transform={`rotate(${spokeRotation} 50 50)`}
          />
        ))}
        <circle
          className="fill-none stroke-[#141311] [stroke-width:3.5]"
          cx="50"
          cy="50"
          r="48"
        />
        <circle className="fill-[#0c0b0a] stroke-[#2a2926] [stroke-width:1]" cx="50" cy="50" r="14" />
      </svg>
    </div>
  );
}

interface CassettePlayerProps {
  sound: SoundItem | null;
  isPlaying: boolean;
  onTogglePlay: (sound: SoundItem) => void;
  onShuffle?: () => void;
  isShuffleLoading?: boolean;
  onStopAll?: () => void;
  isMinimizedDefault?: boolean;
}

export const CassettePlayer: React.FC<CassettePlayerProps> = ({
  sound,
  isPlaying,
  onTogglePlay,
  onShuffle,
  isShuffleLoading = false,
  isMinimizedDefault = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cassetteRef = useRef<HTMLDivElement | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);

  const durationRef = useRef(0);
  const rewindAnimationRef = useRef<number | null>(null);
  const resumeAfterRewindRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [isMinimized, setIsMinimized] = useState(isMinimizedDefault);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Update physical visual cues of tape reels
  const updatePlaybackVisuals = useCallback((time: number) => {
    const cassette = cassetteRef.current;
    if (!cassette) return;

    const mediaDuration = durationRef.current || (sound?.duration ?? 0);
    const progress =
      mediaDuration > 0 ? Math.min(Math.max(time / mediaDuration, 0), 1) : 0;

    cassette.style.setProperty('--reel-rotation', `${(time * 360) % 360}deg`);
    cassette.style.setProperty('--left-tape-scale', `${1 - progress * 0.4}`);
    cassette.style.setProperty('--right-tape-scale', `${0.6 + progress * 0.4}`);
  }, [sound?.duration]);

  // Handle media duration update
  const updateMediaDuration = useCallback(
    (audio: HTMLAudioElement) => {
      const nextDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : sound?.duration || 0;
      durationRef.current = nextDuration;
      setDuration(nextDuration);
      updatePlaybackVisuals(audio.currentTime);
    },
    [sound?.duration, updatePlaybackVisuals]
  );

  // Synchronize audio element playback with parent isPlaying state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sound) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('CassettePlayer autoplay prevented:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, sound]);

  // When sound item changes, reset audio element
  useEffect(() => {
    if (rewindAnimationRef.current !== null) {
      window.cancelAnimationFrame(rewindAnimationRef.current);
      rewindAnimationRef.current = null;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }

    durationRef.current = sound?.duration || 0;
    setCurrentTime(0);
    setDuration(sound?.duration || 0);
    setPlaybackError(null);
    updatePlaybackVisuals(0);
  }, [sound?.id, updatePlaybackVisuals]);

  // RequestAnimationFrame loop for high-precision real-time reel rotation
  useEffect(() => {
    if (!isPlaying) return;

    let frameId = 0;
    function loop() {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
        updatePlaybackVisuals(audio.currentTime);
        frameId = window.requestAnimationFrame(loop);
      }
    }

    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, updatePlaybackVisuals]);

  // Cleanup rewind animation on unmount
  useEffect(() => {
    return () => {
      if (rewindAnimationRef.current !== null) {
        window.cancelAnimationFrame(rewindAnimationRef.current);
      }
    };
  }, []);

  const cancelRewind = () => {
    if (rewindAnimationRef.current === null) return;
    window.cancelAnimationFrame(rewindAnimationRef.current);
    rewindAnimationRef.current = null;
    resumeAfterRewindRef.current = false;
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (rewindAnimationRef.current !== null) {
      window.cancelAnimationFrame(rewindAnimationRef.current);
    }

    resumeAfterRewindRef.current = isPlaying || !audio.paused;
    if (!audio.paused) {
      audio.pause();
    }

    const rewindFrom = currentTime;
    const shouldReduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finishRewind = () => {
      rewindAnimationRef.current = null;
      audio.currentTime = 0;
      setCurrentTime(0);
      updatePlaybackVisuals(0);

      const shouldResume = resumeAfterRewindRef.current;
      resumeAfterRewindRef.current = false;

      if (shouldResume && sound) {
        onTogglePlay(sound);
      }
    };

    if (rewindFrom <= 0 || shouldReduceMotion) {
      finishRewind();
      return;
    }

    const mediaDuration = duration > 0 ? duration : 1;
    const rewindDistance = Math.min(Math.max(rewindFrom / mediaDuration, 0), 1);
    const rewindDuration =
      MIN_REWIND_DURATION +
      (MAX_REWIND_DURATION - MIN_REWIND_DURATION) * rewindDistance;
    const startedAt = performance.now();

    const animateRewind = (now: number) => {
      const linearProgress = Math.min((now - startedAt) / rewindDuration, 1);
      const easedProgress = easeInOutCubic(linearProgress);
      const nextTime = rewindFrom * (1 - easedProgress);

      updatePlaybackVisuals(nextTime);
      setCurrentTime(nextTime);

      if (linearProgress < 1) {
        rewindAnimationRef.current = window.requestAnimationFrame(animateRewind);
        return;
      }

      finishRewind();
    };

    rewindAnimationRef.current = window.requestAnimationFrame(animateRewind);
  };

  const handleSeek = (clientProgress: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    cancelRewind();
    const mediaDuration = durationRef.current || (sound?.duration ?? 0);
    const clampedProgress = Math.min(Math.max(clientProgress, 0), 1);
    const nextTime = clampedProgress * mediaDuration;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    updatePlaybackVisuals(nextTime);
  };

  const handlePointerScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = scrubberTrackRef.current;
    if (!track) return;

    setIsScrubbing(true);
    const audio = audioRef.current;
    resumeAfterScrubRef.current = !!audio && !audio.paused;
    if (audio && !audio.paused) {
      audio.pause();
    }

    const rect = track.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    handleSeek(progress);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const p = (moveEvent.clientX - rect.left) / rect.width;
      handleSeek(p);
    };

    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const shouldResume = resumeAfterScrubRef.current;
      resumeAfterScrubRef.current = false;
      if (shouldResume && sound) {
        audio?.play().catch(() => {});
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (volume === 0) {
      const next = previousVolume || 1;
      audio.volume = next;
      setVolume(next);
    } else {
      setPreviousVolume(volume);
      audio.volume = 0;
      setVolume(0);
    }
  };

  const effectiveDuration = duration > 0 ? duration : (sound?.duration || 0);
  const scrubPercentage =
    effectiveDuration > 0
      ? Math.min(Math.max((currentTime / effectiveDuration) * 100, 0), 100)
      : 0;

  if (!sound) {
    return null;
  }

  const categoryColor = sound.color || '#f43f5e';
  const catalogueNum = sound.rank
    ? `#${String(sound.rank).padStart(3, '0')}`
    : `#${sound.id.slice(-5).toUpperCase()}`;

  return (
    <section
      aria-label={`Deck Retrô K7 - ${sound.title}`}
      className="relative mb-6 w-full rounded-2xl bg-gradient-to-b from-zinc-900/95 via-zinc-900/80 to-zinc-950 border border-zinc-800/90 shadow-2xl p-3 sm:p-5 overflow-hidden transition-all"
    >
      {/* Audio element managed by the physical deck */}
      <audio
        ref={audioRef}
        src={sound.audioUrl}
        preload="auto"
        onLoadedMetadata={(e) => updateMediaDuration(e.currentTarget)}
        onDurationChange={(e) => updateMediaDuration(e.currentTarget)}
        onTimeUpdate={(e) => {
          if (!isScrubbing) {
            setCurrentTime(e.currentTarget.currentTime);
            updatePlaybackVisuals(e.currentTarget.currentTime);
          }
        }}
        onEnded={() => {
          if (sound && isPlaying) {
            onTogglePlay(sound);
          }
        }}
        onError={() => {
          setPlaybackError('Falha ao carregar a trilha da fita.');
        }}
      />

      {/* Hi-Fi Brushed Aluminum Header Strip */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
            <Radio className={`w-3 h-3 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
            <span className="font-bold text-zinc-300">MASTER CASSETTE DECK</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline text-rose-400 font-semibold">HI-FI STEREO</span>
          </div>

          {/* LED Vu-meter indicator */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/80">
            <span className="text-[9px] font-mono text-zinc-500 mr-1">VU</span>
            <span className={`w-1.5 h-2.5 rounded-xs transition-colors ${isPlaying ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-zinc-800'}`} />
            <span className={`w-1.5 h-2.5 rounded-xs transition-colors ${isPlaying ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-zinc-800'}`} />
            <span className={`w-1.5 h-2.5 rounded-xs transition-colors ${isPlaying ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-zinc-800'}`} />
            <span className={`w-1.5 h-2.5 rounded-xs transition-colors ${isPlaying ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-zinc-800'}`} />
          </div>
        </div>

        {/* Deck Quick Actions */}
        <div className="flex items-center gap-1.5">
          {onShuffle && (
            <button
              onClick={onShuffle}
              disabled={isShuffleLoading}
              title="Sortear outra fita aleatória"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Shuffle className={`w-3 h-3 text-amber-400 ${isShuffleLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sortear Fita</span>
            </button>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expandir Deck de Fita' : 'Recolher Deck de Fita'}
            className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-lg bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-800 transition-all cursor-pointer"
          >
            {isMinimized ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono text-[10px]">EXPANDIR</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono text-[10px]">RECOLHER</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body: Full K7 Cassette Player (dqnamo craft) */}
      {!isMinimized ? (
        <div className="flex flex-col items-center justify-center py-2 sm:py-4">
          <div className="w-full max-w-[540px]">
            <div
              ref={cassetteRef}
              className="relative aspect-[1.58] w-full overflow-hidden rounded-[18px] border border-[#050505] bg-[linear-gradient(165deg,#373735_0%,#20201f_52%,#0e0e0d_100%)] shadow-[0_28px_48px_rgba(0,0,0,0.45),0_8px_16px_rgba(0,0,0,0.3),inset_0_2px_1px_rgba(255,255,255,0.2),inset_0_-3px_3px_rgba(0,0,0,0.74)] select-none [--left-tape-scale:1] [--reel-rotation:0deg] [--right-tape-scale:0.6]"
            >
              {/* Outer Inset Highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-1.5 rounded-[13px] border border-white/[0.12] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65)]"
              />

              {/* Noise Texture Overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-100 mix-blend-multiply"
                style={{ backgroundImage: CASSETTE_TEXTURE }}
              />

              {/* 4 Corner Chassis Screws */}
              <Screw className="top-[4%] left-[2.53%]" />
              <Screw className="top-[4%] right-[2.53%]" />
              <Screw className="bottom-[4%] left-[2.53%]" />
              <Screw className="right-[2.53%] bottom-[4%]" />

              {/* Vintage Paper Tape Label */}
              <div
                className="absolute top-[9.5%] right-[8.5%] bottom-[24%] left-[8.5%] z-10 overflow-clip rounded-[9px] border-4 border-transparent shadow-[inset_0_0_14px_rgba(0,0,0,0.6)] [container-type:inline-size]"
                style={{
                  backgroundColor: '#1c1b18',
                  color: '#fdfdfc',
                }}
              >
                {/* Paper texture overlay on label */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{ backgroundImage: CASSETTE_TEXTURE }}
                />

                {/* Label Header: Kicker + Title + Side A Badge */}
                <div className="relative z-20 mx-3 sm:mx-4 mt-2 sm:mt-3 flex items-stretch justify-between gap-2">
                  <div className="grid min-w-0 content-between gap-y-0.5">
                    <span className="font-bold font-mono text-[clamp(8px,2.5cqw,11px)] text-zinc-400 uppercase leading-none tracking-[0.12em] truncate">
                      LADO A • {sound.category.toUpperCase()} • MEME TAPE
                    </span>
                    <h2 className="block truncate font-sans font-black text-[clamp(13px,4.8cqw,22px)] leading-tight tracking-[-0.04em] text-white">
                      {sound.title}
                    </h2>
                  </div>

                  <div className="ml-2 grid shrink-0 content-between justify-items-end gap-y-1 font-bold font-mono uppercase leading-none">
                    <span
                      className="rounded-full border border-white/80 px-2 py-0.5 text-[clamp(8px,2.4cqw,10px)] font-black tracking-[0.08em]"
                      style={{
                        backgroundColor: categoryColor,
                        color: '#ffffff',
                      }}
                    >
                      LADO A
                    </span>
                    <span className="font-mono text-[clamp(7px,2.2cqw,10px)] text-zinc-400 tracking-[0.08em]">
                      {catalogueNum}
                    </span>
                  </div>
                </div>

                {/* Center 3-Stripe Vintage Decal */}
                <div className="relative mt-2 sm:mt-3 h-[36%] [container-type:size]">
                  {/* Retro 3-colored stripes */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-x-1 top-1/2 grid h-[56%] -translate-y-1/2 grid-rows-3 gap-y-0.5 opacity-90"
                  >
                    <span style={{ backgroundColor: categoryColor }} />
                    <span className="bg-amber-500" />
                    <span className="bg-emerald-500" />
                  </div>

                  {/* Tape Spool Window (Pill) */}
                  <div className="absolute inset-y-0 inset-x-[15%] z-20 overflow-hidden rounded-full bg-[#161513] shadow-[0_0_0_4px_rgba(0,0,0,0.45),inset_0_3px_8px_rgba(0,0,0,0.7)] [container-type:size]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply"
                      style={{ backgroundImage: CASSETTE_TEXTURE }}
                    />

                    {/* Middle Clear Window with Magnetic Tape Reels */}
                    <div
                      aria-hidden="true"
                      className="absolute top-[12%] right-[28%] bottom-[12%] left-[28%] z-10 flex items-center justify-evenly overflow-hidden rounded-[3px] border-2 border-[#11100f] bg-[#2a2723] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1),transparent_42%)] shadow-[inset_0_3px_6px_rgba(0,0,0,0.8),0_0_0_2px_rgba(255,255,255,0.06)]"
                    >
                      {/* Left magnetic tape spool */}
                      <span className="absolute top-1/2 left-[calc(50cqh-28cqw)] aspect-square h-[360%] -translate-x-1/2 -translate-y-1/2 scale-[var(--left-tape-scale,1)] rounded-full border border-[#0d0a08] bg-[repeating-radial-gradient(circle,#050505_0_2px,#171717_2px_4px)] shadow-[inset_0_0_5px_rgba(0,0,0,0.7),0_1px_2px_rgba(0,0,0,0.5)] will-change-transform" />

                      {/* Right magnetic tape spool */}
                      <span className="absolute top-1/2 left-[calc(72cqw-50cqh)] aspect-square h-[360%] -translate-x-1/2 -translate-y-1/2 scale-[var(--right-tape-scale,0.6)] rounded-full border border-[#0d0a08] bg-[repeating-radial-gradient(circle,#050505_0_2px,#171717_2px_4px)] shadow-[inset_0_0_5px_rgba(0,0,0,0.7),0_1px_2px_rgba(0,0,0,0.5)] will-change-transform" />

                      {/* Calibration Tick Marks */}
                      {TAPE_WINDOW_DIVIDERS.map((divider) => (
                        <span
                          className="relative z-10 h-[42%] w-0.5 bg-[rgba(224,215,195,0.32)]"
                          key={divider}
                        />
                      ))}
                    </div>

                    {/* Dual Mechanical Rotating Reels (SVG) */}
                    <Reel className="left-[50cqh]" />
                    <Reel className="left-[calc(100%-50cqh)]" />
                  </div>
                </div>

                {/* Scrubber Progress Slider */}
                <div className="absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 left-3 sm:left-4 z-30 grid gap-y-1">
                  <div
                    ref={scrubberTrackRef}
                    onPointerDown={handlePointerScrub}
                    className="group/scrub relative flex h-5 w-full cursor-pointer touch-none items-center"
                  >
                    {/* Track Background */}
                    <div className="relative h-[3.5px] w-full rounded-full bg-zinc-800 shadow-inner group-hover/scrub:h-[5px] transition-all">
                      {/* Active Fill */}
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${scrubPercentage}%`,
                          backgroundColor: categoryColor,
                        }}
                      />
                      {/* Scrub Thumb */}
                      <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-[12px] rounded-full border-2 border-zinc-950 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] group-hover/scrub:scale-125 transition-transform"
                        style={{ left: `${scrubPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Time Markers */}
                  <div className="relative z-20 flex items-baseline justify-between font-mono text-[10px] text-zinc-400 tabular-nums leading-none">
                    <span>{formatTime(currentTime)}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-zinc-500 font-sans text-[9px] uppercase">
                        {isPlaying ? 'TOCANDO' : 'PAUSADO'}
                      </span>
                      <span>{formatTime(effectiveDuration)}</span>
                    </span>
                  </div>
                </div>

                {/* Subtle outer label border overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 z-20 rounded-[inherit] border-4 border-black/30"
                />
              </div>

              {/* Bottom Recessed Trapezoid Deck Controls */}
              <div className="absolute right-[27%] bottom-[3.5%] left-[27%] z-30 grid h-[16%] grid-cols-[1fr_auto_1fr] place-items-center gap-x-[clamp(6px,1.5cqw,12px)] bg-[color-mix(in_srgb,#50504d_22%,transparent)] px-[12%] shadow-[inset_0_3px_8px_rgba(0,0,0,0.65)] [clip-path:polygon(13%_0,87%_0,100%_100%,0_100%)]">
                {/* Restart / Rewind Button */}
                <button
                  type="button"
                  aria-label="Rebobinar áudio"
                  title="Rebobinar do início"
                  onClick={restart}
                  disabled={currentTime <= 0.05}
                  className={`${BUTTON_CLASSES} w-[clamp(24px,6.5cqw,34px)] border-[#82827c] bg-[#5c5b56] shadow-[0_2px_5px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#706f68]`}
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pausar áudio' : 'Tocar áudio'}
                  title={isPlaying ? 'Pausar' : 'Tocar'}
                  onClick={() => onTogglePlay(sound)}
                  className={`${BUTTON_CLASSES} w-[clamp(30px,8.4cqw,44px)] border-[#bcbbb5]/60 bg-[#878680] shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-[#7a7972]`}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                {/* Mute / Unmute Button */}
                <button
                  type="button"
                  aria-label={volume === 0 ? 'Desmutar' : 'Mutar'}
                  title={volume === 0 ? 'Desmutar som' : 'Mutar som'}
                  onClick={toggleMute}
                  className={`${BUTTON_CLASSES} w-[clamp(24px,6.5cqw,34px)] border-[#82827c] bg-[#5c5b56] shadow-[0_2px_5px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#706f68]`}
                >
                  {volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {playbackError && (
              <p className="mt-2 text-center text-xs text-rose-400 font-medium" role="alert">
                {playbackError}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Compact Minimized Dock Bar */
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onTogglePlay(sound)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-md shrink-0 cursor-pointer transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
                <span>{sound.category}</span>
                <span>•</span>
                <span>{catalogueNum}</span>
              </div>
              <h3 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">
                {sound.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-zinc-400 shrink-0">
            <span>{formatTime(currentTime)} / {formatTime(effectiveDuration)}</span>
            <button
              onClick={restart}
              title="Rebobinar"
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cassette Deck Bottom Metadata & Stats */}
      <div className="mt-2 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Reproduções:</span>
            <strong className="text-zinc-200 font-mono">{formatPlays(sound.plays)}</strong>
          </span>
          {sound.isTrending && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
              🔥 EM ALTA
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sound.submitted_by?.name && (
            <span className="text-zinc-500">
              Enviado por <strong className="text-zinc-300">@{sound.submitted_by.name}</strong>
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
