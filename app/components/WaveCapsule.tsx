'use client';

import React, { useMemo, useState } from 'react';
import { Share2, Download, Heart, Check, Activity, Play, Square, Trash2 } from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';
import { downloadSoundMp3 } from '../lib/downloadAudio';

interface WaveCapsuleProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  hotkey?: number;
  onNotify?: (message: string) => void;
}

/**
 * Generates a unique, deterministic acoustic waveform signature per sound ID.
 */
function generateWaveformBars(seedStr: string, count = 20): number[] {
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
    const raw = (Math.abs(hash) % 72) + 22; // 22% to 94%
    // Natural envelope (slightly higher energy in middle)
    const env = 0.72 + 0.28 * Math.sin(((i + 0.5) / count) * Math.PI);
    bars.push(Math.round(Math.min(96, Math.max(18, raw * env))));
  }
  return bars;
}

export const WaveCapsule: React.FC<WaveCapsuleProps> = ({
  sound,
  isPlaying,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  onDelete,
  hotkey,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  const waveBars = useMemo(() => generateWaveformBars(sound.id || sound.title, 20), [sound.id, sound.title]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const slug = encodeURIComponent(sound.slug || sound.id);
      navigator.clipboard.writeText(`${window.location.origin}/?sound=${slug}`);
      setCopied(true);
      onNotify?.(`Link de "${sound.title}" copiado!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onNotify?.(`Baixando "${sound.title}.mp3"...`);
    await downloadSoundMp3(sound.audioUrl, sound.slug || sound.id);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(sound.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(sound.id);
  };

  const accent = sound.color || '#10B981';
  const durationSec = Math.max(sound.duration || 2, 0.5);

  return (
    <div
      onClick={() => onPlay(sound)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(sound);
        }
      }}
      className={`group relative select-none rounded-xl p-3 transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.98] ${
        isPlaying
          ? 'scale-[1.02] shadow-xl bg-zinc-900 ring-2'
          : 'bg-[linear-gradient(160deg,#18181b_0%,#111113_100%)] border border-zinc-800/90 hover:border-zinc-700 hover:shadow-lg'
      }`}
      style={{
        boxShadow: isPlaying ? `0 12px 28px -8px ${accent}40` : undefined,
        borderColor: isPlaying ? accent : undefined,
        ['--tw-ring-color' as string]: isPlaying ? `${accent}aa` : undefined,
      }}
    >
      {/* Subtle Studio Hardware Top Accent Line */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[2px] opacity-55 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Ambient Hover / Active Glow */}
      <div
        aria-hidden="true"
        className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl transition-opacity duration-300 pointer-events-none ${
          isPlaying ? 'opacity-25' : 'opacity-0 group-hover:opacity-10'
        }`}
        style={{ backgroundColor: accent }}
      />

      {/* Header with Studio LED, Category, Rank & Hotkey */}
      <div className="relative flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full transition-all shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: accent,
              boxShadow: isPlaying ? `0 0 8px ${accent}` : `0 0 4px ${accent}66`,
              transform: isPlaying ? 'scale(1.15)' : 'scale(1)',
            }}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
            {sound.category}
          </span>
          {sound.rank !== undefined && (
            <span
              className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] font-black tracking-tight flex items-center gap-0.5 ${
                sound.rank === 1
                  ? 'bg-amber-400/25 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-500/20'
                  : sound.rank === 2
                  ? 'bg-slate-300/25 text-slate-200 border border-slate-300/50'
                  : sound.rank === 3
                  ? 'bg-amber-700/25 text-amber-400 border border-amber-600/50'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
              }`}
            >
              {sound.rank === 1 ? '🥇 #1' : sound.rank === 2 ? '🥈 #2' : sound.rank === 3 ? '🥉 #3' : `🔥 #${sound.rank}`}
            </span>
          )}
          {sound.isTrending && sound.rank === undefined && (
            <span className="shrink-0 px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold tracking-tight">
              🔥 EM ALTA
            </span>
          )}
          {sound.isCustom && (
            <span className="shrink-0 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold tracking-tight">
              {sound.submitted_by?.name ? `por @${sound.submitted_by.name.split(' ')[0]}` : 'ENVIADO'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-zinc-500">
            {sound.duration ? `${sound.duration.toFixed(1)}s` : '2.0s'}
          </span>
          {hotkey !== undefined && (
            <span
              aria-hidden="true"
              title={`Atalho: tecla ${hotkey}`}
              className="hidden sm:inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded bg-zinc-950 border border-zinc-700/80 text-[9px] font-mono font-bold text-zinc-400 group-hover:text-emerald-300 group-hover:border-emerald-500/50 transition-colors"
            >
              {hotkey}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="relative font-semibold text-sm text-zinc-100 line-clamp-1 group-hover:text-white mb-2.5">
        {sound.title}
      </h3>

      {/* Waveform & Tactile Play Trigger Row */}
      <div className="relative flex items-center gap-2 mb-2.5">
        {/* Play / Stop Studio Trigger Button */}
        <div
          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-md ${
            isPlaying
              ? 'text-white scale-105 ring-2 ring-white/40'
              : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/90 group-hover:scale-105 group-hover:border-zinc-500'
          }`}
          style={{
            backgroundColor: isPlaying ? accent : undefined,
            boxShadow: isPlaying ? `0 0 14px ${accent}66` : undefined,
          }}
        >
          {isPlaying ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5 transition-colors" style={{ color: accent }} />
          )}
        </div>

        {/* Unique Acoustic Waveform with SoundCloud-style Sweep */}
        <div className="relative h-9 flex-1 bg-zinc-950/90 border border-zinc-800/90 rounded-xl px-2 flex items-center overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.65)]">
          {/* Base dim waveform (always visible & unique per sound) */}
          <div className="w-full h-full flex items-center justify-between gap-[2px] py-1.5">
            {waveBars.map((heightPercent, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-full transition-opacity duration-200 opacity-35 group-hover:opacity-55"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: accent,
                }}
              />
            ))}
          </div>

          {/* Active animated sweep overlay when playing */}
          {isPlaying && (
            <div
              className="absolute inset-0 px-2 py-1.5 flex items-center justify-between gap-[2px] plonk-wave-sweep pointer-events-none"
              style={{ animationDuration: `${durationSec}s` }}
            >
              {waveBars.map((heightPercent, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: accent,
                    boxShadow: `0 0 6px ${accent}aa`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Details & Actions */}
      <div className="relative flex items-center justify-between text-zinc-500 text-[11px] pt-0.5">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-3 h-3 ${isPlaying ? 'animate-spin' : ''}`} style={{ color: isPlaying ? accent : undefined }} />
          <span className="font-mono text-[10px]">
            {isPlaying ? 'EXECUTANDO' : formatPlays(sound.plays)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {sound.isCustom && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Excluir este som"
              className="p-1 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            title="Copiar link"
            className="p-1 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Baixar MP3"
            className="p-1 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFavorite}
            title="Favoritar"
            className={`p-1 transition-colors cursor-pointer ${
              isFavorite ? 'text-rose-500' : 'hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Bottom Progress Bar */}
      {isPlaying && (
        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-zinc-900/80 overflow-hidden pointer-events-none">
          <div
            className="h-full origin-left plonk-card-progress"
            style={{
              backgroundColor: accent,
              animationDuration: `${durationSec}s`,
            }}
          />
        </div>
      )}
    </div>
  );
};
