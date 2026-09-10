'use client';

import React, { useState } from 'react';
import { Share2, Download, Heart, Check, Play, Square, Trash2 } from 'lucide-react';
import { SoundItem } from '../types';
import { formatPlays } from '../lib/formatters';

interface CassetteTapeProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const REEL_SPOKES = [0, 60, 120, 180, 240, 300] as const;

function MiniScrew({ className = '' }: { className?: string }) {
  const slotClasses =
    'absolute top-1/2 right-[18%] left-[18%] h-[14%] -translate-y-1/2 rounded-full bg-[#181816] shadow-[inset_0_1px_1px_rgba(0,0,0,0.85),0_1px_rgba(255,255,255,0.15)]';

  return (
    <div
      aria-hidden="true"
      className={`absolute z-10 aspect-square w-2 h-2 rounded-full border border-[#050505] bg-[radial-gradient(circle_at_36%_30%,#666663,#333330_48%,#171716_78%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_1px_rgba(0,0,0,0.4)] pointer-events-none ${className}`}
    >
      <span className={`${slotClasses} rotate-45`} />
      <span className={`${slotClasses} -rotate-45`} />
    </div>
  );
}

function MiniReel({ isSpinning = false }: { isSpinning?: boolean }) {
  return (
    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center pointer-events-none">
      <svg
        aria-hidden="true"
        className={`w-full h-full origin-center ${isSpinning ? 'animate-spin' : ''}`}
        style={{ animationDuration: '0.8s' }}
        viewBox="0 0 100 100"
      >
        <circle className="fill-[#181817] stroke-[#0d0c0b] [stroke-width:2]" cx="50" cy="50" r="48" />
        {REEL_SPOKES.map((rot) => (
          <path
            key={rot}
            className="fill-[#2a2926] stroke-[#0a0a09] [stroke-width:1.5]"
            d="M46 4h8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"
            transform={`rotate(${rot} 50 50)`}
          />
        ))}
        <circle className="fill-none stroke-[#121110] [stroke-width:3]" cx="50" cy="50" r="48" />
        <circle className="fill-[#0c0b0a] stroke-[#3a3936] [stroke-width:1.5]" cx="50" cy="50" r="14" />
      </svg>
    </div>
  );
}

export const CassetteTape: React.FC<CassetteTapeProps> = ({
  sound,
  isPlaying,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  onDelete,
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(sound.id);
  };

  const categoryColor = sound.color || '#f43f5e';
  const catalogueNum = sound.rank
    ? `#${String(sound.rank).padStart(3, '0')}`
    : `#${sound.id.slice(-5).toUpperCase()}`;

  return (
    <div
      onClick={() => onPlay(sound)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onPlay(sound) : null)}
      className={`group relative select-none rounded-xl p-2.5 sm:p-3 transition-all duration-200 cursor-pointer overflow-hidden ${
        isPlaying
          ? 'scale-[1.02] shadow-2xl shadow-rose-500/25 ring-2 ring-rose-500 bg-[linear-gradient(165deg,#323230_0%,#1f1f1e_52%,#121211_100%)]'
          : 'bg-[linear-gradient(165deg,#262624_0%,#181817_52%,#0e0e0d_100%)] border border-zinc-800/90 hover:border-zinc-700 hover:shadow-xl hover:scale-[1.01]'
      }`}
    >
      {/* 4 Authentic Chassis Screws */}
      <MiniScrew className="top-2 left-2" />
      <MiniScrew className="top-2 right-2" />
      <MiniScrew className="bottom-2 left-2" />
      <MiniScrew className="bottom-2 right-2" />

      {/* Cassette Upper Label (Side A & Title) */}
      <div
        className="relative overflow-hidden rounded-lg p-2.5 transition-colors border shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]"
        style={{
          backgroundColor: isPlaying ? '#242320' : '#1c1b18',
          borderColor: isPlaying ? `${categoryColor}80` : '#27272a',
          borderLeftWidth: '4px',
          borderLeftColor: categoryColor,
        }}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 truncate">
              LADO A • {sound.category.toUpperCase()}
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
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
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
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            {catalogueNum}
          </span>
        </div>

        {/* Sound Title */}
        <h3 className="font-bold text-sm text-zinc-100 tracking-tight line-clamp-1 group-hover:text-white">
          {sound.title}
        </h3>
      </div>

      {/* Retro 3-Stripe Accent Line across the cassette center */}
      <div className="relative mt-2 px-1">
        <div className="grid grid-rows-3 gap-y-0.5 h-1.5 rounded-full overflow-hidden opacity-80">
          <span style={{ backgroundColor: categoryColor }} />
          <span className="bg-amber-500" />
          <span className="bg-emerald-500" />
        </div>
      </div>

      {/* Cassette Center Window with Dual SVG Spool Gears */}
      <div className="relative my-2 h-10 rounded-md bg-[#141311] border border-zinc-800/80 px-3 flex items-center justify-between overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
        {/* Left Spool / Reel */}
        <MiniReel isSpinning={isPlaying} />

        {/* Central Play/Stop Trigger (Evident Functionality) */}
        <div className="flex-1 mx-2 flex items-center justify-center z-10">
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all shadow-md ${
              isPlaying
                ? 'text-white scale-105 shadow-lg shadow-rose-500/30 ring-2 ring-white/40 animate-pulse'
                : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/90 group-hover:scale-105 group-hover:border-zinc-500'
            }`}
            style={{
              backgroundColor: isPlaying ? categoryColor : undefined,
            }}
          >
            {isPlaying ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>PARAR</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current ml-0.5 text-rose-400 group-hover:text-white" />
                <span>PLAY</span>
              </>
            )}
          </div>
        </div>

        {/* Right Spool / Reel */}
        <MiniReel isSpinning={isPlaying} />
      </div>

      {/* Cassette Footer & Quick Actions */}
      <div className="flex items-center justify-between text-zinc-500 pt-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isPlaying ? '#10B981' : '#52525b' }}
          />
          <span className="font-mono text-[10px]">
            {isPlaying ? 'TOCANDO...' : formatPlays(sound.plays)}
          </span>
        </div>

        {/* Action icons */}
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
