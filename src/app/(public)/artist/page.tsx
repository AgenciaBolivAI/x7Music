'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Music, ArrowRight } from 'lucide-react';
import { getArtists, type Artist } from '@/api/artistApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtube: 'YouTube',
  amazonMusic: 'Amazon Music',
  tidal: 'Tidal',
};

const StreamLink = ({ href, label }: { href: string; label: string }) =>
  href ? (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-brand-red transition-colors">
      {label} <ExternalLink size={11} />
    </a>
  ) : null;

export default function ArtistPage() {
  const { t } = useLanguage();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArtists()
      .then((res) => setArtists(res.data.artists))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const offers = [
    { title: t('artist.offers.pubTitle'), desc: t('artist.offers.pubDesc') },
    { title: t('artist.offers.distTitle'), desc: t('artist.offers.distDesc') },
    { title: t('artist.offers.auditTitle'), desc: t('artist.offers.auditDesc') },
    { title: t('artist.offers.consultTitle'), desc: t('artist.offers.consultDesc') },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Artists" description="Meet the talented Christian artists of X7 Music Group — from producers to worship leaders building careers with integrity." url="/artist" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('artist.rosterLabel')}</p>
        <h1 className="section-title mb-6">{t('artist.heroTitle')}</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('artist.heroSubtitle')}
        </p>
      </section>

      {/* Artist cards */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          artists.map((artist) => (
            <div key={artist._id} className="card overflow-hidden mb-8">
              <div className="flex flex-col md:flex-row">
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-full md:w-64 h-64 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-full md:w-64 h-64 bg-brand-gray-light flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-brand-red/20 flex items-center justify-center mx-auto mb-3">
                        <Music size={28} className="text-brand-red" />
                      </div>
                      <p className="text-brand-gray-muted text-xs">{t('artist.photoComingSoon')}</p>
                    </div>
                  </div>
                )}
                <div className="p-6 md:p-8 flex flex-col justify-center flex-1">
                  <div className="mb-4">
                    <h2 className="text-2xl font-heading font-bold text-white">{artist.name}</h2>
                    {artist.tagline && <p className="text-brand-red text-sm font-medium">{artist.tagline}</p>}
                  </div>
                  {artist.bio && (
                    <p className="text-brand-gray-muted leading-relaxed mb-6 line-clamp-3">{artist.bio}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {artist.streamingLinks &&
                      Object.entries(artist.streamingLinks).map(([platform, url]) =>
                        url ? (
                          <StreamLink key={platform} href={url} label={PLATFORM_LABELS[platform] ?? platform} />
                        ) : null
                      )}
                    <Link
                      href={`/artist/${artist.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-red text-white hover:bg-brand-red/80 transition-colors"
                    >
                      {t('artist.viewProfile')} <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Roster CTA */}
        <div className="card p-10 text-center">
          <div className="w-16 h-16 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music size={28} className="text-brand-red" />
          </div>
          <h3 className="text-white font-heading font-semibold text-xl mb-2">{t('artist.moreArtists')}</h3>
          <p className="text-brand-gray-muted max-w-md mx-auto mb-6">
            {t('artist.moreArtistsDesc')}
          </p>
          <Link href="/contact" className="btn-primary inline-flex items-center gap-2">
            {t('artist.workWithUs')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* What X7 offers */}
      <section className="py-20 px-4 bg-brand-gray/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title">{t('artist.offersTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {offers.map(({ title, desc }) => (
              <div key={title} className="card p-6">
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/book" className="btn-primary inline-flex items-center gap-2">
              {t('artist.startConsult')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
