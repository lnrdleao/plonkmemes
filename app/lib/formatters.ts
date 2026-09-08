export function formatPlays(plays: number): string {
  if (!plays || plays <= 0) return '0 plays';
  
  if (plays < 1000) {
    return `${plays} ${plays === 1 ? 'play' : 'plays'}`;
  }

  // Formata 1.234 -> 1,2k / 15.400 -> 15,4k / 1.000.000 -> 1M
  const formatted = new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(plays).toLowerCase();

  return `${formatted} plays`;
}
