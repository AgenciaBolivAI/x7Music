'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Music } from 'lucide-react';
import { getReleases, type Release } from '@/api/releaseApi';
import { toYouTubeEmbedUrl } from '@/utils/media';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

// Official X7 Music Group playlist on Spotify
const X7_PLAYLIST_EMBED = 'https://open.spotify.com/embed/playlist/1MQ5fElExqrRneTfGpT4dR';

const StreamingButton = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-brand-red hover:text-white transition-colors"
  >
    {label} <ExternalLink size={11} />
  </a>
);

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtube: 'YouTube',
  amazonMusic: 'Amazon Music',
  tidal: 'Tidal',
};

export default function MusicPage() {
  const { t } = useLanguage();
  const [releases, setReleases] = useState<Release[]>([]);
  const [filter, setFilter] = useState<'all' | 'single' | 'ep' | 'album'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReleases()
      .then((res) => setReleases(res.data.releases))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? releases : releases.filter((r) => r.type === filter);

  const videos = releases
    .map((r) => ({ release: r, embed: toYouTubeEmbedUrl(r.streamingLinks?.youtube) }))
    .filter((v): v is { release: Release; embed: string } => v.embed !== null);

  const filterLabels: Record<string, string> = {
    all: t('music.allReleases'),
    single: t('music.singles'),
    ep: t('music.eps'),
    album: t('music.albums'),
  };

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Music" description="Stream X7 Music Group releases on Spotify, Apple Music, YouTube, and all major platforms. Singles, EPs, and albums from our Christian artists." url="/music" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-16 px-4 text-center">
        <h1 className="section-title mb-4">{t('music.title')}</h1>
        <p className="text-brand-gray-muted max-w-xl mx-auto">
          {t('music.subtitle')}
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['all', 'single', 'ep', 'album'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors
                ${filter === f ? 'bg-brand-red text-white' : 'bg-brand-gray text-brand-gray-muted hover:text-white'}`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Music size={48} className="text-brand-gray-muted mx-auto mb-4" />
            <p className="text-brand-gray-muted">{t('music.noReleases')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((release) => (
              <div key={release._id} className="card overflow-hidden group">
                {release.coverArtUrl ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={release.coverArtUrl}
                      alt={release.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-brand-gray-light flex items-center justify-center">
                    <Music size={48} className="text-brand-gray-muted" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-white font-semibold leading-tight">{release.title}</p>
                  <p className="text-brand-gray-muted text-sm mt-0.5">{release.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-brand-gray-muted text-xs capitalize">{release.type}</span>
                    <span className="text-brand-gray-muted text-xs">·</span>
                    <span className="text-brand-gray-muted text-xs">
                      {new Date(release.releaseDate).getFullYear()}
                    </span>
                  </div>
                  {release.streamingLinks && Object.keys(release.streamingLinks).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(release.streamingLinks).map(([platform, url]) =>
                        url ? (
                          <StreamingButton
                            key={platform}
                            href={url}
                            label={PLATFORM_LABELS[platform] ?? platform}
                          />
                        ) : null
                      )}
                    </div>
                  )}
                  {release.description && (
                    <p className="text-brand-gray-muted text-xs mt-3 line-clamp-2">{release.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── The X7 Playlist (Spotify embed) ─────────────────────────────────── */}
      <section className="bg-brand-gray/30 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="section-title mb-2">{t('music.playlistTitle')}</h2>
            <p className="text-brand-gray-muted">{t('music.playlistSubtitle')}</p>
          </div>
          <iframe
            src={X7_PLAYLIST_EMBED}
            title="X7 Music Group Playlist"
            className="w-full rounded-xl"
            height="420"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </section>

      {/* ── Videos (YouTube embeds from releases) ───────────────────────────── */}
      {videos.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="section-title mb-2">{t('music.videosTitle')}</h2>
              <p className="text-brand-gray-muted">{t('music.videosSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {videos.map(({ release, embed }) => (
                <div key={release._id}>
                  <div className="aspect-video rounded-xl overflow-hidden bg-brand-gray">
                    <iframe
                      src={embed}
                      title={release.title}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <p className="text-white text-sm font-medium mt-3">{release.title}</p>
                  <p className="text-brand-gray-muted text-xs">{release.artist}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
