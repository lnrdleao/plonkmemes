'use client';

import React, { useState } from 'react';
import { Share2, Download, Heart, Check } from 'lucide-react';
import { SoundItem } from '../types';

interface CassetteTapeProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const CassetteTape: React.FC<CassetteTapeProps> = ({
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
      className={`group relative select-none rounded-xl p-3 transition-all duration-200 cursor-pointer ${
        isPlaying
          ? 'scale-[1.02] shadow-xl shadow-rose-500/20 ring-2 ring-rose-500'
          : 'bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 hover:shadow-lg'
      }`}
      style={{
        background: isPlaying
          ? `linear-gradient(145deg, #18181b 0%, ${sound.color}15 100%)`
          : undefined,
      }}
    >
      {/* Tape Shell Screws */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-700/60 border border-zinc-600/40" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-700/60 border border-zinc-600/40" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-700/60 border border-zinc-600/40" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-700/60 border border-zinc-600/40" />

      {/* Cassette Upper Label (Side A & Title) */}
      <div
        className="relative overflow-hidden rounded-lg p-2.5 transition-colors"
        style={{
          backgroundColor: isPlaying ? `${sound.color}25` : '#27272a',
          borderLeft: `4px solid ${sound.color}`,
        }}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
            LADO A • {sound.category.toUpperCase()}
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            {sound.duration ? `${sound.duration}s` : '0:02'}
          </span>
        </div>

        {/* Sound Title */}
        <h3 className="font-bold text-sm text-zinc-100 tracking-tight line-clamp-1 group-hover:text-white">
          {sound.title}
        </h3>
      </div>

      {/* Cassette Center Window with Spools */}
      <div className="relative my-2 h-10 rounded-md bg-zinc-950/90 border border-zinc-800/80 px-4 flex items-center justify-between overflow-hidden">
        {/* Tape progress fill in window when playing */}
        {isPlaying && (
          <div
            className="absolute inset-0 opacity-15 animate-pulse"
            style={{ backgroundColor: sound.color }}
          />
        )}

        {/* Left Spool / Reel */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-6 h-6 rounded-full border-2 border-zinc-600 bg-zinc-900 flex items-center justify-center ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '0.8s' }}
          >
            <div className="w-4 h-4 rounded-full border border-dashed border-zinc-400 flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isPlaying ? sound.color : '#71717a' }}
              />
            </div>
          </div>
        </div>

        {/* Central Tape View Window & Reel Bar */}
        <div className="flex-1 mx-3 flex items-center justify-center">
          <div className="w-full h-2 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden flex items-center px-1">
            <div
              className={`h-1 rounded-full transition-all ${
                isPlaying ? 'w-full bg-rose-500 animate-pulse' : 'w-1/3 bg-zinc-700'
              }`}
              style={{ backgroundColor: isPlaying ? sound.color : undefined }}
            />
          </div>
        </div>

        {/* Right Spool / Reel */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-6 h-6 rounded-full border-2 border-zinc-600 bg-zinc-900 flex items-center justify-center ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '0.8s' }}
          >
            <div className="w-4 h-4 rounded-full border border-dashed border-zinc-400 flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isPlaying ? sound.color : '#71717a' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cassette Footer & Quick Actions */}
      <div className="flex items-center justify-between text-zinc-500 pt-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isPlaying ? '#10B981' : '#52525b' }}
          />
          <span className="font-mono text-[10px]">
            {isPlaying ? 'TOCANDO...' : `${sound.plays.toLocaleString('pt-BR')} plays`}
          </span>
        </div>

        {/* Action icons */}
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
