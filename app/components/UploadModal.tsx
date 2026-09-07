'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Music, Check, Play, Square } from 'lucide-react';
import { SoundCategory, SoundItem } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (sound: SoundItem) => void;
}

const COLOR_OPTIONS = [
  '#E11D48',
  '#8B5CF6',
  '#0EA5E9',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#6366F1',
  '#EF4444',
  '#14B8A6',
  '#EAB308',
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SoundCategory>('memes-web');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }
      setAudioFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);

      if (!title) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        setTitle(cleanName);
      }
    }
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !audioUrl) return;

    const newSound: SoundItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      audioUrl: audioUrl,
      category,
      color,
      plays: 1,
      duration: audioPreviewRef.current?.duration || 2.0,
      tags: [category, 'upload'],
      isCustom: true,
    };

    onUploadSuccess(newSound);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Subir Novo Som</h3>
              <p className="text-xs text-zinc-400">Adicione um meme ou efeito de áudio para a sua soundboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {audioUrl && (
          <audio
            ref={audioPreviewRef}
            src={audioUrl}
            onEnded={() => setIsPlayingPreview(false)}
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Arquivo de Áudio (MP3, WAV, OGG - max 5MB)
            </label>
            <div className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl bg-zinc-950/50 cursor-pointer transition-colors">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                required={!audioUrl}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Music className="w-8 h-8 text-zinc-500 mb-1" />
              <span className="text-xs text-zinc-300 font-medium">
                {audioFile ? audioFile.name : 'Clique ou arraste um arquivo de áudio'}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">MP3, WAV, OGG</span>

              {audioUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview();
                  }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
                >
                  {isPlayingPreview ? (
                    <>
                      <Square className="w-3 h-3 fill-rose-500 text-rose-500" />
                      Parar Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                      Testar Áudio
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Nome do Som
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Receba!, Dança Gatinho, É brincadeira hein"
              required
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SoundCategory)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="tv-radio">TV & Rádio</option>
              <option value="memes-web">Memes da Web</option>
              <option value="efeitos">Efeitos Sonoros</option>
              <option value="bordoes">Bordões</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Cor de Destaque do Objeto
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !audioUrl}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20"
            >
              Salvar e Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
