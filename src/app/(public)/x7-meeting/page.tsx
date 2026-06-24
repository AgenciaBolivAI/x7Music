'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Users, Mic2, BookOpen, MapPin } from 'lucide-react';
import SEO from '@/components/common/SEO';
import { useEffect, useState } from 'react';
import { getEvents, type Event } from '@/api/eventApi';
import { useLanguage } from '@/context/LanguageContext';

export default function X7MeetingPage() {
  const { t } = useLanguage();
  const [meetingEvents, setMeetingEvents] = useState<Event[]>([]);

  const features = [
    {
      icon: Mic2,
      title: t('x7meeting.features.performances'),
      desc: t('x7meeting.features.performancesDesc'),
    },
    {
      icon: BookOpen,
      title: t('x7meeting.features.education'),
      desc: t('x7meeting.features.educationDesc'),
    },
    {
      icon: Users,
      title: t('x7meeting.features.networking'),
      desc: t('x7meeting.features.networkingDesc'),
    },
    {
      icon: Calendar,
      title: t('x7meeting.features.quarterly'),
      desc: t('x7meeting.features.quarterlyDesc'),
    },
  ];

  const whoItems = [
    { title: t('x7meeting.who.artists'), desc: t('x7meeting.who.artistsDesc') },
    { title: t('x7meeting.who.worship'), desc: t('x7meeting.who.worshipDesc') },
    { title: t('x7meeting.who.professionals'), desc: t('x7meeting.who.professionalsDesc') },
  ];

  useEffect(() => {
    getEvents()
      .then((res) => setMeetingEvents(res.data.events.filter((e) => e.type === 'meeting').slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="X7 Meeting" description="Join the X7 Meeting — a quarterly community gathering for Christian artists, producers, and music professionals to connect, learn, and grow together." url="/x7-meeting" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('x7meeting.communityLabel')}</p>
        <h1 className="section-title mb-6">{t('x7meeting.heroTitle')}</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('x7meeting.heroSubtitle')}
        </p>
        <Link href="/book" className="btn-primary mt-8 inline-flex items-center gap-2">
          {t('x7meeting.registerNext')} <ArrowRight size={16} />
        </Link>
      </section>

      {/* What is X7 Meeting */}
      <section className="py-20 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="section-title">{t('x7meeting.whatIsTitle')}</h2>
        </div>
        <p className="text-brand-gray-muted text-lg leading-relaxed text-center max-w-3xl mx-auto mb-12">
          {t('x7meeting.whatIsBody')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 flex gap-4">
              <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={18} className="text-brand-red" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">{title}</h3>
                <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming meeting events */}
      {meetingEvents.length > 0 && (
        <section className="py-16 px-4 bg-brand-gray/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="section-title text-center mb-10">{t('x7meeting.upcomingMeetings')}</h2>
            <div className="space-y-4">
              {meetingEvents.map((ev) => (
                <div key={ev._id} className="card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  {ev.imageUrl && (
                    <img src={ev.imageUrl} alt={ev.title} className="w-24 h-24 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{ev.title}</h3>
                    <p className="text-brand-gray-muted text-sm">
                      {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {ev.location && (
                      <p className="text-brand-gray-muted text-sm flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {ev.location}
                      </p>
                    )}
                    {ev.description && <p className="text-brand-gray-muted text-sm mt-2">{ev.description}</p>}
                  </div>
                  {ev.ticketLink && (
                    <a href={ev.ticketLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm shrink-0">
                      {t('x7meeting.register')}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/events" className="text-brand-red hover:underline flex items-center justify-center gap-1 text-sm">
                {t('x7meeting.viewAllEvents')} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Who should attend */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title">{t('x7meeting.whoTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {whoItems.map(({ title, desc }) => (
              <div key={title} className="card p-6">
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-brand-red/10 border-y border-brand-red/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="section-title mb-4">{t('x7meeting.ctaTitle')}</h2>
          <p className="text-brand-gray-muted mb-8">
            {t('x7meeting.ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events" className="btn-primary flex items-center justify-center gap-2">
              {t('x7meeting.seeEvents')} <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn-outline">{t('x7meeting.contactUs')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
