'use client';

import React, { useState } from 'react';
import { Share2, Download, Heart, Check, Battery, Volume2 } from 'lucide-react';
import { SoundItem } from '../types';

interface PocketPlayerProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const PocketPlayer: React.FC<PocketPlayerProps> = ({
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

  return (
    <div
      onClick={() => onPlay(sound)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onPlay(sound) : null)}
      className={`group relative select-none rounded-2xl p-3.5 transition-all duration-200 cursor-pointer overflow-hidden ${
        isPlaying
          ? 'scale-[1.02] shadow-xl shadow-rose-500/25 ring-2 ring-white/50'
          : 'border border-zinc-800/80 hover:border-zinc-700 hover:shadow-lg'
      }`}
      style={{
        background: `linear-gradient(165deg, ${sound.color}22 0%, #18181b 45%, #09090b 100%)`,
        borderColor: isPlaying ? sound.color : undefined,
      }}
    >
      {/* Metallic Specular Bezel Highlight */}
      <div
        className="absolute top-0 inset-x-0 h-1 opacity-75 rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, transparent, ${sound.color}, transparent)`,
        }}
      />

      {/* Retro Backlit Screen Window */}
      <div
        className={`relative rounded-xl p-2.5 transition-all duration-300 border ${
          isPlaying
            ? 'bg-zinc-900 border-zinc-700 shadow-inner'
            : 'bg-zinc-950/90 border-zinc-850'
        }`}
        style={{
          boxShadow: isPlaying ? `0 0 16px ${sound.color}20 inset` : undefined,
        }}
      >
        {/* Screen Top Status Bar */}
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pb-1.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-1">
            {isPlaying ? (
              <span className="flex items-center gap-1 font-bold text-emerald-400 animate-pulse">
                <Volume2 className="w-2.5 h-2.5" />
                <span>TOCANDO</span>
              </span>
            ) : (
              <span className="text-zinc-500 font-medium">POCKET POD</span>
            )}
          </div>

          {sound.isTrending && (
            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold">
              🔥 EM ALTA
            </span>
          )}

          <div className="flex items-center gap-1 text-zinc-400">
            <span>{sound.duration ? `${sound.duration}s` : '0:02'}</span>
            <Battery className="w-2.5 h-2.5 text-zinc-400" />
          </div>
        </div>

        {/* Screen Main Content Area */}
        <div className="py-2.5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 line-clamp-1 mb-0.5">
            {sound.category.toUpperCase()}
          </p>
          <h3 className="font-black text-sm text-zinc-100 line-clamp-1 tracking-tight group-hover:text-white">
            {sound.title}
          </h3>

          {/* Mini Scrubber / Audio Progress Bar */}
          <div className="mt-2 w-full h-1.5 bg-zinc-800/90 rounded-full overflow-hidden flex items-center px-0.5">
            <div
              className={`h-1 rounded-full transition-all ${
                isPlaying ? 'w-full animate-pulse' : 'w-1/4'
              }`}
              style={{
                backgroundColor: sound.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* The Iconic Tactile Click Wheel */}
      <div className="relative my-3 flex items-center justify-center">
        {/* Outer Circular Wheel */}
        <div
          className={`relative w-20 h-20 rounded-full border flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-zinc-900 border-zinc-700 shadow-lg'
              : 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-850 group-hover:scale-105'
          }`}
          style={{
            boxShadow: isPlaying ? `0 0 20px ${sound.color}30` : undefined,
          }}
        >
          {/* Top Cardinal Label: MENU */}
          <span className="absolute top-1.5 text-[8px] font-black tracking-widest text-zinc-400">
            MENU
          </span>

          {/* Left Cardinal: PREV */}
          <span className="absolute left-1.5 text-[8px] font-black tracking-tighter text-zinc-400">
            |◀◀
          </span>

          {/* Right Cardinal: NEXT */}
          <span className="absolute right-1.5 text-[8px] font-black tracking-tighter text-zinc-400">
            ▶▶|
          </span>

          {/* Bottom Cardinal: PLAY/PAUSE */}
          <span className="absolute bottom-1.5 text-[8px] font-black tracking-tighter text-zinc-400">
            ▶❚❚
          </span>

          {/* Tactile Center Action Button */}
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-md ${
              isPlaying
                ? 'text-white scale-110 shadow-lg ring-2 ring-white/50'
                : 'bg-zinc-950 border-zinc-750 text-zinc-200 group-hover:scale-110'
            }`}
            style={{
              backgroundColor: isPlaying ? sound.color : undefined,
            }}
          >
            <span className="text-[10px] font-black leading-none ml-0.5">
              {isPlaying ? '■' : '▶'}
            </span>
          </div>
        </div>
      </div>

      {/* Pocket Player Footer & Actions */}
      <div className="flex items-center justify-between text-zinc-500 pt-1 text-[11px] border-t border-zinc-850/80">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isPlaying ? '#10B981' : '#52525b' }}
          />
          <span className="font-mono text-[10px]">
            {isPlaying ? 'EXECUTANDO' : `${sound.plays.toLocaleString('pt-BR')} plays`}
          </span>
        </div>

        {/* Quick Action Icons */}
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
