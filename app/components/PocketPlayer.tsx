'use client';

import React, { useState } from 'react';
import { Share2, Download, Heart, Check, Battery, Volume2, Trash2 } from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';
import { downloadSoundMp3 } from '../lib/downloadAudio';

interface PocketPlayerProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  hotkey?: number;
  onNotify?: (message: string) => void;
}

export const PocketPlayer: React.FC<PocketPlayerProps> = ({
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

  const accent = sound.color || '#F59E0B';
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
      className={`group relative select-none rounded-2xl p-3 transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.98] ${
        isPlaying
          ? 'scale-[1.02] shadow-xl ring-2 ring-white/45'
          : 'border border-zinc-700/70 hover:border-zinc-600 hover:shadow-xl'
      }`}
      style={{
        background: `linear-gradient(155deg, ${accent}33 0%, #232327 36%, #141417 75%, #0c0c0e 100%)`,
        borderColor: isPlaying ? accent : undefined,
        boxShadow: isPlaying
          ? `0 12px 26px -8px ${accent}50, inset 0 1px 0 rgba(255,255,255,0.22)`
          : 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.6)',
      }}
    >
      {/* Brushed Aluminum Top Edge Specular Highlight */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-3 h-[1.5px] opacity-80 rounded-t-2xl pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, rgba(255,255,255,0.65), ${accent}, transparent)`,
        }}
      />

      {/* Retro Backlit LCD Screen Window with Acrylic Glass Glare */}
      <div
        className={`relative rounded-xl p-2 transition-all duration-300 border overflow-hidden ${
          isPlaying
            ? 'bg-[#12161c] border-zinc-600/80'
            : 'bg-[#0c0e12] border-zinc-800/90'
        }`}
        style={{
          boxShadow: isPlaying
            ? `inset 0 0 18px ${accent}28, inset 0 2px 6px rgba(0,0,0,0.8)`
            : 'inset 0 2px 6px rgba(0,0,0,0.85)',
        }}
      >
        {/* Diagonal Acrylic Glass Reflection */}
        <div
          aria-hidden="true"
          className="absolute -top-6 -left-6 w-28 h-24 rotate-[25deg] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none"
        />

        {/* Screen Top Status Bar */}
        <div className="relative flex items-center justify-between gap-1 text-[9px] font-mono text-zinc-400 pb-1 border-b border-zinc-800/80">
          <div className="flex items-center gap-1 min-w-0">
            {isPlaying ? (
              <span className="flex items-center gap-1 font-bold text-emerald-400 animate-pulse">
                <Volume2 className="w-2.5 h-2.5 shrink-0" />
                <span>PLAY</span>
              </span>
            ) : (
              <span className="text-zinc-500 font-semibold tracking-tight">POD</span>
            )}

            {sound.rank !== undefined && (
              <span
                className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight flex items-center gap-0.5 shrink-0 ${
                  sound.rank === 1
                    ? 'bg-amber-400/25 text-amber-300 border border-amber-400/50'
                    : sound.rank === 2
                    ? 'bg-slate-300/25 text-slate-200 border border-slate-300/50'
                    : sound.rank === 3
                    ? 'bg-amber-700/25 text-amber-400 border border-amber-600/50'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                }`}
              >
                {sound.rank === 1 ? '🥇#1' : sound.rank === 2 ? '🥈#2' : sound.rank === 3 ? '🥉#3' : `#${sound.rank}`}
              </span>
            )}
            {sound.isTrending && sound.rank === undefined && (
              <span className="px-1 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold shrink-0">
                🔥
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-zinc-400 shrink-0">
            <span>{sound.duration ? `${sound.duration.toFixed(1)}s` : '2.0s'}</span>
            <Battery className="w-2.5 h-2.5 text-emerald-400/80" />
            {hotkey !== undefined && (
              <span
                aria-hidden="true"
                title={`Atalho: tecla ${hotkey}`}
                className="hidden sm:inline-flex items-center justify-center min-w-[15px] h-[15px] px-0.5 rounded bg-zinc-900 border border-zinc-700 text-[8px] font-mono font-bold text-zinc-300"
              >
                {hotkey}
              </span>
            )}
          </div>
        </div>

        {/* Screen Main Content Area */}
        <div className="relative py-2 text-center">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 line-clamp-1 mb-0.5">
            {sound.category}
          </p>
          <h3 className="font-black text-sm text-zinc-100 line-clamp-1 tracking-tight group-hover:text-white">
            {sound.title}
          </h3>

          {/* Real-time LCD Progress Scrubber */}
          <div className="mt-2 w-full h-1.5 bg-zinc-800/90 rounded-full overflow-hidden shadow-inner">
            {isPlaying && (
              <div
                className="h-full w-full origin-left plonk-card-progress rounded-full"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 0 8px ${accent}`,
                  animationDuration: `${durationSec}s`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tactile 3D Click Wheel */}
      <div className="relative my-2.5 flex items-center justify-center">
        <div
          className={`relative w-[74px] h-[74px] rounded-full border flex items-center justify-center transition-all duration-200 ${
            isPlaying
              ? 'border-zinc-500/80 scale-[1.03]'
              : 'border-zinc-700/80 group-hover:scale-105'
          }`}
          style={{
            background:
              'radial-gradient(circle at 32% 28%, #2e2e33 0%, #1c1c20 55%, #121215 100%)',
            boxShadow: isPlaying
              ? `0 0 22px ${accent}38, inset 0 2px 3px rgba(255,255,255,0.14), inset 0 -3px 6px rgba(0,0,0,0.8)`
              : '0 4px 12px rgba(0,0,0,0.55), inset 0 1.5px 2px rgba(255,255,255,0.1), inset 0 -2px 5px rgba(0,0,0,0.75)',
          }}
        >
          <span className="absolute top-1 text-[7px] font-black tracking-widest text-zinc-400">
            MENU
          </span>
          <span className="absolute left-1.5 text-[7px] font-black tracking-tighter text-zinc-400">
            |◀◀
          </span>
          <span className="absolute right-1.5 text-[7px] font-black tracking-tighter text-zinc-400">
            ▶▶|
          </span>
          <span className="absolute bottom-1 text-[7px] font-black tracking-tighter text-zinc-400">
            ▶❚❚
          </span>

          {/* Concave Center Action Button */}
          <div
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
              isPlaying
                ? 'text-white scale-110 ring-2 ring-white/45 border-white/30'
                : 'border-zinc-700/90 text-zinc-200 group-hover:scale-110'
            }`}
            style={{
              background: isPlaying
                ? accent
                : 'radial-gradient(circle at 65% 70%, #26262b 0%, #111114 75%)',
              boxShadow: isPlaying
                ? `0 0 12px ${accent}88`
                : 'inset 0 2px 4px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.12)',
            }}
          >
            <span className="text-[9px] font-black leading-none ml-0.5">
              {isPlaying ? '■' : '▶'}
            </span>
          </div>
        </div>
      </div>

      {/* Pocket Player Footer & Actions */}
      <div className="flex items-center justify-between text-zinc-500 pt-1 text-[11px] border-t border-zinc-800/70">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isPlaying ? '#10B981' : '#52525b' }}
          />
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
    </div>
  );
};
