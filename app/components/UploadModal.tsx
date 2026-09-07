'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Music, Check, Play, Square, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
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

async function validateAudioSecurity(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. Limite de tamanho (mínimo 500 bytes, máximo 5MB)
  if (file.size < 500) {
    return { valid: false, error: 'O arquivo é muito pequeno ou está corrompido.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'O arquivo excede o limite máximo permitido de 5MB.' };
  }

  // 2. Validação rigorosa de extensão permitida
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Extensão não permitida (${ext}). Envie estritamente arquivos de áudio legítimos (MP3, WAV, OGG, M4A).`,
    };
  }

  // 3. Inspeção de Magic Bytes (Assinatura Binária do Arquivo)
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Assinaturas binárias reais de áudio:
    // MP3 com tag ID3: 'ID3' (0x49, 0x44, 0x33)
    const isID3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
    // MP3 raw frame sync: 0xFF seguido de 0xFB, 0xF3, 0xF2, 0xFA, 0xE0+
    const isMP3Sync = bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0;
    // WAV: 'RIFF' ... 'WAVE' (0x52, 0x49, 0x46, 0x46)
    const isRIFF = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    // OGG: 'OggS' (0x4F, 0x67, 0x67, 0x53)
    const isOGG = bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
    // M4A: 'ftyp' no offset 4 (0x66, 0x74, 0x79, 0x70)
    const isM4A = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;

    if (!isID3 && !isMP3Sync && !isRIFF && !isOGG && !isM4A) {
      return {
        valid: false,
        error: 'Arquivo rejeitado pela segurança: o cabeçalho binário não corresponde a um formato de áudio legítimo.',
      };
    }
  } catch {
    return { valid: false, error: 'Não foi possível ler os cabeçalhos do arquivo.' };
  }

  // 4. Teste de decodificação no sandbox de áudio do navegador
  try {
    const testAudio = document.createElement('audio');
    const testUrl = URL.createObjectURL(file);
    testAudio.src = testUrl;

    const canDecode = await new Promise<boolean>((resolve) => {
      testAudio.onloadedmetadata = () => {
        URL.revokeObjectURL(testUrl);
        resolve(true);
      };
      testAudio.onerror = () => {
        URL.revokeObjectURL(testUrl);
        resolve(false);
      };
      setTimeout(() => {
        URL.revokeObjectURL(testUrl);
        resolve(false);
      }, 3000);
    });

    if (!canDecode) {
      return {
        valid: false,
        error: 'O arquivo não pôde ser decodificado como áudio e foi rejeitado por segurança.',
      };
    }
  } catch {
    return { valid: false, error: 'Falha no decodificador de áudio.' };
  }

  return { valid: true };
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SoundCategory>('memes');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'verified' | 'rejected'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setSecurityStatus('idle');
    setErrorMessage(null);

    const validation = await validateAudioSecurity(file);
    setIsValidating(false);

    if (!validation.valid) {
      setSecurityStatus('rejected');
      setErrorMessage(validation.error || 'Arquivo inválido.');
      setAudioFile(null);
      setAudioUrl('');
      return;
    }

    setSecurityStatus('verified');
    setAudioFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAudioUrl(objectUrl);

    if (!title) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/[<>]/g, '')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setTitle(cleanName.slice(0, 60));
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

              {/* Security Validation Status */}
              {isValidating && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analisando cabeçalho binário e integridade do áudio...</span>
                </div>
              )}

              {securityStatus === 'verified' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Áudio seguro: Assinatura binária e codec verificados com sucesso.</span>
                </div>
              )}

              {audioUrl && securityStatus === 'verified' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview();
                  }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition-colors"
                >
                  {isPlayingPreview ? (
                    <>
                      <Square className="w-3 h-3 fill-rose-500 text-rose-500" />
                      Parar Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                      Ouvir Teste do Áudio
                    </>
                  )}
                </button>
              )}

              {securityStatus === 'rejected' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
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
              <option value="memes">🎭 Memes & Zueira</option>
              <option value="games">🎮 Games & Discord</option>
              <option value="tv-filmes">📺 TV, Filmes & Séries</option>
              <option value="efeitos">🔊 Efeitos Sonoros</option>
              <option value="streamers">🎙️ Streamers & Famosos</option>
              <option value="musica">🎵 Música & Vinhetas</option>
              <option value="bordoes">🗣️ Bordões Curtos</option>
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
