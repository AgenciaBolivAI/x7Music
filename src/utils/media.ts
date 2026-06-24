// Convert public Spotify/YouTube URLs into their embeddable player URLs.
// Returns null when the URL isn't recognized so callers can fall back to a plain link.

export const toSpotifyEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.includes('/embed/')) return url;
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|artist|album|track)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
};

export const toYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};
