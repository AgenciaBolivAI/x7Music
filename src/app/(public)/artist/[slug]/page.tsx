'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink, Music, Instagram, Facebook, Globe } from 'lucide-react';
import { getArtistBySlug, type Artist } from '@/api/artistApi';
import { toSpotifyEmbedUrl, toYouTubeEmbedUrl } from '@/utils/media';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtube: 'YouTube',
  amazonMusic: 'Amazon Music',
  tidal: 'Tidal',
};

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music,
  website: Globe,
};

export default function ArtistDetailPage() {
  const { slug } = useParams() as { slug: string };
  const { t } = useLanguage();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getArtistBySlug(slug)
      .then((res) => setArtist(res.data.artist))
      .catch(() => setArtist(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="pt-24 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <Music size={48} className="text-brand-gray-muted mb-4" />
        <p className="text-brand-gray-muted text-lg mb-6">{t('artist.notFound')}</p>
        <Link href="/artist" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {t('artist.backToArtists')}
        </Link>
      </div>
    );
  }

  const spotifyEmbed = toSpotifyEmbedUrl(artist.spotifyEmbedUrl || artist.streamingLinks?.spotify);
  const videoEmbed = toYouTubeEmbedUrl(artist.featuredVideoUrl);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title={artist.name} description={artist.tagline || `${artist.name} — X7 Music Group artist`} url={`/artist/${artist.slug}`} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/artist" className="inline-flex items-center gap-1.5 text-sm text-brand-gray-muted hover:text-white transition-colors mb-8">
            <ArrowLeft size={14} /> {t('artist.backToArtists')}
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
            {artist.imageUrl ? (
              <img src={artist.imageUrl} alt={artist.name}
                className="w-48 h-48 md:w-56 md:h-56 rounded-xl object-cover shadow-2xl shrink-0" />
            ) : (
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl bg-brand-gray-light flex items-center justify-center shrink-0">
                <Music size={48} className="text-brand-red" />
              </div>
            )}
            <div className="text-center md:text-left">
              <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-2">{t('artist.rosterLabel')}</p>
              <h1 className="text-4xl md:text-5xl font-heading font-black text-white mb-2">{artist.name}</h1>
              {artist.tagline && <p className="text-brand-gray-muted text-lg">{artist.tagline}</p>}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-5">
                {artist.streamingLinks &&
                  Object.entries(artist.streamingLinks).map(([platform, url]) =>
                    url ? (
                      <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-brand-red transition-colors">
                        {PLATFORM_LABELS[platform] ?? platform} <ExternalLink size={11} />
                      </a>
                    ) : null
                  )}
                {artist.socialLinks &&
                  Object.entries(artist.socialLinks).map(([network, url]) => {
                    if (!url) return null;
                    const Icon = SOCIAL_ICONS[network] ?? Globe;
                    return (
                      <a key={network} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white hover:bg-brand-red transition-colors">
                        <Icon size={14} />
                      </a>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      {artist.bio && (
        <section className="max-w-3xl mx-auto px-4 py-14">
          {artist.bio.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="text-brand-gray-muted leading-relaxed mb-4">{para}</p>
          ))}
        </section>
      )}

      {/* Listen */}
      {spotifyEmbed && (
        <section className="max-w-3xl mx-auto px-4 pb-14">
          <h2 className="text-2xl font-heading font-bold text-white mb-6">{t('artist.listenOn')}</h2>
          <iframe
            src={spotifyEmbed}
            title={`${artist.name} on Spotify`}
            className="w-full rounded-xl"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </section>
      )}

      {/* Featured video */}
      {videoEmbed && (
        <section className="max-w-3xl mx-auto px-4 pb-14">
          <h2 className="text-2xl font-heading font-bold text-white mb-6">{t('artist.featuredVideo')}</h2>
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={videoEmbed}
              title={`${artist.name} — featured video`}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand-red/10 border-y border-brand-red/20 py-16 px-4 text-center">
        <h2 className="section-title mb-4">{t('artist.moreArtists')}</h2>
        <p className="text-brand-gray-muted mb-8 max-w-md mx-auto">{t('artist.moreArtistsDesc')}</p>
        <Link href="/contact" className="btn-primary inline-flex items-center gap-2">
          {t('artist.workWithUs')} <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
