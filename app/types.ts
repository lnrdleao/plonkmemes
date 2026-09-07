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
  slug: string;
  audioUrl: string;
  category: SoundCategory;
  color: string; // Hex color for the cassette/capsule
  plays: number;
  duration?: number; // seconds
  tags: string[];
  isCustom?: boolean;
  isTrending?: boolean;
}

