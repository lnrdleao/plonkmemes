export type SoundCategory =
  | 'memes'
  | 'games'
  | 'tv-filmes'
  | 'efeitos'
  | 'streamers'
  | 'musica'
  | 'bordoes';

export type CategoryFilter = 'todos' | 'em-alta' | SoundCategory;

export type ViewMode = 'cassette' | 'waveform' | 'pocket';

export interface SoundItem {
  id: string;
  title: string;
  name?: string;
  slug: string;
  audioUrl: string;
  category: SoundCategory;
  color: string; // Hex color for the cassette/capsule
  plays: number;
  duration?: number; // seconds
  tags: string[];
  isCustom?: boolean;
  isTrending?: boolean;
  loudness?: {
    standard: string;
    target_lufs: number;
    integrated_lufs: number;
    true_peak_dbtp: number;
    loudness_range_lra?: number;
  };
}


