/**
 * Downloads an MP3 directly via Blob so the browser saves the file
 * instead of opening a separate audio player tab.
 */
export async function downloadSoundMp3(audioUrl: string, filenameBase: string): Promise<boolean> {
  const safeName = (filenameBase || 'plonkmeme')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const filename = `${safeName || 'plonkmeme'}.mp3`;

  try {
    const response = await fetch(audioUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return true;
  } catch {
    // Fallback if CORS or network prevents Blob download
    window.open(audioUrl, '_blank', 'noopener,noreferrer');
    return false;
  }
}
