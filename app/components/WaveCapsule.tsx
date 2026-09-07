'use client';

import React, { useState } from 'react';
import { Share2, Download, Heart, Check, Activity, Play, Square } from 'lucide-react';
import { SoundItem } from '../types';

interface WaveCapsuleProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const WaveCapsule: React.FC<WaveCapsuleProps> = ({
  sound,
  isPlaying,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}#${sound.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(sound.audioUrl, '_blank');
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(sound.id);
  };

  const waveBars = [35, 65, 85, 45, 95, 70, 40, 90, 60, 80, 50, 100, 75, 40];

  return (
    <div
      onClick={() => onPlay(sound)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onPlay(sound) : null)}
      className={`group relative select-none rounded-xl p-3 transition-all duration-200 cursor-pointer overflow-hidden ${
        isPlaying
          ? 'scale-[1.02] shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500 bg-zinc-900'
          : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 hover:shadow-md'
      }`}
    >
      {/* Dynamic Background Glow on Play */}
      {isPlaying && (
        <div
          className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: sound.color }}
        />
      )}

      {/* Header with Category & Duration */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full transition-transform shrink-0"
            style={{
              backgroundColor: sound.color,
              transform: isPlaying ? 'scale(1.2)' : 'scale(1)',
            }}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
            {sound.category}
          </span>
          {sound.isTrending && (
            <span className="shrink-0 px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold tracking-tight">
              🔥 EM ALTA
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
          {sound.duration ? `${sound.duration}s` : '0:02'}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-zinc-100 line-clamp-1 group-hover:text-white mb-3">
        {sound.title}
      </h3>

      {/* Waveform & Tactile Play Trigger Row */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* Unmistakable Play Button */}
        <div
          className={`h-9 px-3 shrink-0 rounded-xl flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase transition-all shadow-md ${
            isPlaying
              ? 'text-white scale-105 shadow-lg shadow-emerald-500/30 ring-2 ring-white/40 animate-pulse'
              : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/90 group-hover:scale-105 group-hover:border-zinc-500'
          }`}
          style={{
            backgroundColor: isPlaying ? sound.color : undefined,
          }}
        >
          {isPlaying ? (
            <>
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>PARAR</span>
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-current ml-0.5 text-emerald-400 group-hover:text-white" />
              <span>PLAY</span>
            </>
          )}
        </div>

        {/* Acoustic Waveform Frequency Bars */}
        <div className="h-9 flex-1 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-2.5 flex items-center justify-between gap-1 overflow-hidden">
          {waveBars.map((heightPercent, idx) => (
            <div
              key={idx}
              className="flex-1 rounded-full transition-all"
              style={{
                height: isPlaying ? `${Math.max(20, (heightPercent * ((idx % 3) + 1)) % 100)}%` : '20%',
                backgroundColor: isPlaying ? sound.color : '#3f3f46',
                animation: isPlaying
                  ? `pulse 0.4s ease-in-out infinite alternate ${idx * 0.04}s`
                  : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer Details & Actions */}
      <div className="flex items-center justify-between text-zinc-500 text-[11px] pt-0.5">
        <div className="flex items-center gap-1">
          <Activity className={`w-3 h-3 ${isPlaying ? 'text-emerald-400 animate-spin' : ''}`} />
          <span className="font-mono text-[10px]">
            {isPlaying ? 'EXECUTANDO' : `${sound.plays.toLocaleString('pt-BR')} plays`}
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleShare}
            title="Copiar link"
            className="p-1 hover:text-zinc-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Baixar MP3"
            className="p-1 hover:text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFavorite}
            title="Favoritar"
            className={`p-1 transition-colors ${
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
