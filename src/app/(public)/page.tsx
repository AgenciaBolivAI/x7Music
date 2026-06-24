'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Music, Users, Globe, BookOpen, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { getFeaturedReleases, type Release } from '@/api/releaseApi';
import { getEvents, type Event } from '@/api/eventApi';
import { getFeaturedArtists, type Artist } from '@/api/artistApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtube: 'YouTube',
  amazonMusic: 'Amazon Music',
  tidal: 'Tidal',
};

export default function HomePage() {
  const { t } = useLanguage();
  const [releases, setReleases] = useState<Release[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const services = [
    { icon: Music, title: t('home.services.consultingTitle'), desc: t('home.services.consultingDesc') },
    { icon: BookOpen, title: t('home.services.proTitle'), desc: t('home.services.proDesc') },
    { icon: Globe, title: t('home.services.distTitle'), desc: t('home.services.distDesc') },
    { icon: Users, title: t('home.services.pubTitle'), desc: t('home.services.pubDesc') },
  ];

  useEffect(() => {
    getFeaturedReleases()
      .then((res) => setReleases(res.data.releases))
      .catch(() => {});
    getEvents()
      .then((res) => setEvents(res.data.events.slice(0, 3)))
      .catch(() => {});
    getFeaturedArtists()
      .then((res) => setArtists(res.data.artists))
      .catch(() => {});
  }, []);

  return (
    <div>
      <SEO url="/" />
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(192,57,43,0.15)_0%,_transparent_70%)]" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-6">
            {t('home.heroLabel')}
          </p>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white leading-tight mb-6">
            {t('home.heroTitle1')}<br />
            <span className="text-brand-red">{t('home.heroTitle2')}</span>
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('home.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book" className="btn-primary text-base px-8 py-4 flex items-center justify-center gap-2">
              {t('home.bookFreeConsult')} <ArrowRight size={18} />
            </Link>
            <Link href="/music" className="btn-outline text-base px-8 py-4">
              {t('home.exploreMusic')}
            </Link>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-12 bg-brand-red animate-pulse" />
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">{t('home.servicesTitle')}</h2>
          <p className="section-subtitle mx-auto text-center max-w-2xl">
            {t('home.servicesSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 hover:border-brand-red/50 transition-colors group">
              <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-red/20 transition-colors">
                <Icon size={22} className="text-brand-red" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/book" className="btn-primary">
            {t('home.bookCTA')}
          </Link>
        </div>
      </section>

      {/* ── Featured Artists ────────────────────────────────────────────────── */}
      {artists.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title">{t('home.featuredArtists')}</h2>
                <p className="section-subtitle mt-1">{t('home.featuredArtistsSubtitle')}</p>
              </div>
              <Link href="/artist" className="text-brand-red hover:underline flex items-center gap-1 text-sm shrink-0">
                {t('home.allArtists')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {artists.map((a) => (
                <Link key={a._id} href={`/artist/${a.slug}`} className="group text-center">
                  <div className="aspect-square rounded-full overflow-hidden bg-brand-gray mb-4 mx-auto max-w-[180px] border-2 border-transparent group-hover:border-brand-red transition-colors">
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt={a.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={32} className="text-brand-gray-muted" />
                      </div>
                    )}
                  </div>
                  <p className="text-white font-semibold leading-tight">{a.name}</p>
                  {a.tagline && <p className="text-brand-gray-muted text-xs mt-0.5">{a.tagline}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Releases ───────────────────────────────────────────────── */}
      {releases.length > 0 && (
        <section className="py-20 px-4 bg-brand-gray/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title">{t('home.featuredMusic')}</h2>
                <p className="section-subtitle mt-1">{t('home.featuredSubtitle')}</p>
              </div>
              <Link href="/music" className="text-brand-red hover:underline flex items-center gap-1 text-sm shrink-0">
                {t('home.allReleases')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {releases.map((r) => (
                <div key={r._id} className="group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-brand-gray mb-3">
                    {r.coverArtUrl ? (
                      <img
                        src={r.coverArtUrl}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={32} className="text-brand-gray-muted" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium leading-tight truncate">{r.title}</p>
                  <p className="text-brand-gray-muted text-xs truncate">{r.artist}</p>
                  {r.streamingLinks?.spotify && (
                    <a
                      href={r.streamingLinks.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-brand-red text-xs hover:underline"
                    >
                      <ExternalLink size={10} /> {t('music.stream')}
                    </a>
                  )}
                  {!r.streamingLinks?.spotify && r.streamingLinks && (
                    (() => {
                      const first = Object.entries(r.streamingLinks).find(([, v]) => v);
                      return first ? (
                        <a
                          href={first[1]!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-brand-red text-xs hover:underline"
                        >
                          <ExternalLink size={10} /> {PLATFORM_LABELS[first[0]] ?? t('music.stream')}
                        </a>
                      ) : null;
                    })()
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Events ─────────────────────────────────────────────────── */}
      {events.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="section-title">{t('home.upcomingEvents')}</h2>
                <p className="section-subtitle mt-1">{t('home.upcomingSubtitle')}</p>
              </div>
              <Link href="/events" className="text-brand-red hover:underline flex items-center gap-1 text-sm shrink-0">
                {t('home.allEvents')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div key={ev._id} className="card overflow-hidden hover:border-brand-red/40 transition-colors">
                  {ev.imageUrl ? (
                    <img src={ev.imageUrl} alt={ev.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-brand-gray-light flex items-center justify-center">
                      <Calendar size={32} className="text-brand-gray-muted" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-white font-semibold leading-tight mb-1">{ev.title}</p>
                    <p className="text-brand-gray-muted text-sm">
                      {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {ev.location && (
                      <p className="text-brand-gray-muted text-xs flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {ev.location}
                      </p>
                    )}
                    {ev.ticketLink && (
                      <a
                        href={ev.ticketLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-brand-red text-xs hover:underline"
                      >
                        {t('events.getTickets')} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Mission Statement ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-brand-gray/30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('home.missionLabel')}</p>
          <blockquote className="text-2xl md:text-3xl font-heading font-bold text-white leading-snug mb-6">
            {t('home.missionQuote')}
          </blockquote>
          <p className="text-brand-gray-muted leading-relaxed">
            {t('home.missionDesc')}
          </p>
          <Link href="/about" className="btn-outline mt-8 inline-block">
            {t('home.readStory')}
          </Link>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="bg-brand-red/10 border-y border-brand-red/20 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="section-title mb-4">{t('home.ctaTitle')}</h2>
          <p className="text-brand-gray-muted text-lg mb-8">
            {t('home.ctaSubtitle')}
          </p>
          <Link href="/book" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            {t('home.ctaButton')} <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
