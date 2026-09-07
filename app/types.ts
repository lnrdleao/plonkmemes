export type SoundCategory = 'tv-radio' | 'memes-web' | 'efeitos' | 'bordoes';

export type CategoryFilter = 'todos' | SoundCategory;

export type ViewMode = 'cassette' | 'waveform';

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
}
