import type { MetadataRoute } from 'next';
import { INITIAL_SOUNDS } from './data/initial-sounds';

const BASE_URL = 'https://plonkmemes.lol';

const CATEGORIES = [
  'em-alta',
  'todos',
  'memes',
  'games',
  'tv-filmes',
  'efeitos',
  'streamers',
  'musica',
  'bordoes',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/?cat=${cat}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
  ];

  const seenSlugs = new Set<string>();
  const soundRoutes: MetadataRoute.Sitemap = [];

  for (const sound of INITIAL_SOUNDS) {
    const slug = sound.slug || sound.id;
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    soundRoutes.push({
      url: `${BASE_URL}/?sound=${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: sound.isTrending ? 'daily' : 'weekly',
      priority: sound.isTrending ? 0.8 : 0.6,
    });
  }

  return [...staticRoutes, ...soundRoutes];
}
