'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, ExternalLink, Ticket } from 'lucide-react';
import { getEvents, getPastEvents, type Event } from '@/api/eventApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

const EventCard = ({ event, t }: { event: Event; t: (key: string) => string }) => (
  <div className="card overflow-hidden flex flex-col sm:flex-row">
    {event.imageUrl ? (
      <img
        src={event.imageUrl}
        alt={event.title}
        className="w-full sm:w-48 h-48 sm:h-auto object-cover shrink-0"
      />
    ) : (
      <div className="w-full sm:w-48 h-32 bg-brand-gray-light flex items-center justify-center shrink-0">
        <Calendar size={32} className="text-brand-gray-muted" />
      </div>
    )}
    <div className="p-5 flex flex-col justify-between flex-1">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white font-heading font-semibold text-lg leading-tight">{event.title}</h3>
          <span className="text-xs text-brand-gray-muted shrink-0 bg-brand-gray px-2 py-0.5 rounded-full">
            {t(`events.types.${event.type}`)}
          </span>
        </div>
        <p className="text-brand-gray-muted text-sm mb-1">{formatDate(event.date)}</p>
        {event.location && (
          <p className="text-brand-gray-muted text-sm flex items-center gap-1.5 mb-3">
            <MapPin size={13} /> {event.location}
          </p>
        )}
        {event.description && (
          <p className="text-brand-gray-muted text-sm line-clamp-2">{event.description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {event.ticketLink && (
          <a
            href={event.ticketLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Ticket size={14} /> {t('events.getTickets')}
          </a>
        )}
        {event.virtualLink && (
          <a
            href={event.virtualLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <ExternalLink size={14} /> {t('events.watchOnline')}
          </a>
        )}
      </div>
    </div>
  </div>
);

export default function EventsPage() {
  const { t } = useLanguage();
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [past, setPast] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<'all' | Event['type']>('all');

  const bySeries = (list: Event[]) =>
    series === 'all' ? list : list.filter((ev) => ev.type === series);

  useEffect(() => {
    Promise.all([getEvents(), getPastEvents()])
      .then(([upRes, pastRes]) => {
        setUpcoming(upRes.data.events);
        setPast(pastRes.data.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Events" description="Upcoming X7 Music Group events — X7 Music Spotlight, Night of Worship, and community meetings for Christian artists and professionals." url="/events" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-16 px-4 text-center">
        <h1 className="section-title mb-4">{t('events.title')}</h1>
        <p className="text-brand-gray-muted max-w-xl mx-auto">
          {t('events.subtitle')}
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        {/* Series filter */}
        <div className="flex gap-2 mb-10 flex-wrap">
          {(['all', 'spotlight', 'worship', 'pinstage', 'meeting'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeries(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${series === s ? 'bg-brand-red text-white' : 'bg-brand-gray text-brand-gray-muted hover:text-white'}`}
            >
              {s === 'all' ? t('events.allSeries') : t(`events.types.${s}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Upcoming */}
            <div className="mb-14">
              <h2 className="text-2xl font-heading font-bold text-white mb-6">{t('events.upcoming')}</h2>
              {bySeries(upcoming).length === 0 ? (
                <div className="card p-10 text-center">
                  <Calendar size={40} className="text-brand-gray-muted mx-auto mb-4" />
                  <p className="text-brand-gray-muted">{t('events.noUpcoming')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bySeries(upcoming).map((ev) => <EventCard key={ev._id} event={ev} t={t} />)}
                </div>
              )}
            </div>

            {/* Past */}
            {bySeries(past).length > 0 && (
              <div>
                <h2 className="text-xl font-heading font-bold text-white mb-6 opacity-70">{t('events.past')}</h2>
                <div className="space-y-4 opacity-60">
                  {bySeries(past).map((ev) => <EventCard key={ev._id} event={ev} t={t} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
