'use client';

import Link from 'next/link';
import { ArrowRight, Music, Shield, Users, TrendingUp } from 'lucide-react';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  const timeline = [
    { year: '2017', event: t('about.timeline.e2017') },
    { year: '2019', event: t('about.timeline.e2019') },
    { year: '2021', event: t('about.timeline.e2021') },
    { year: '2023', event: t('about.timeline.e2023') },
    { year: '2025', event: t('about.timeline.e2025') },
  ];

  const values = [
    {
      icon: Shield,
      title: t('about.values.integrityTitle'),
      desc: t('about.values.integrityDesc'),
    },
    {
      icon: Music,
      title: t('about.values.craftTitle'),
      desc: t('about.values.craftDesc'),
    },
    {
      icon: Users,
      title: t('about.values.communityTitle'),
      desc: t('about.values.communityDesc'),
    },
    {
      icon: TrendingUp,
      title: t('about.values.generationalTitle'),
      desc: t('about.values.generationalDesc'),
    },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <SEO
        title="About"
        description="Learn about X7 Music Group, founded by Steven Pantojas — a Christian music label, consulting firm, and publishing company helping artists build sustainable careers."
        url="/about"
      />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('about.heroLabel')}</p>
        <h1 className="section-title mb-6">{t('about.heroTitle')}</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('about.heroSubtitle')}
        </p>
      </section>

      {/* Steven's bio */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="bg-brand-gray rounded-2xl aspect-[3/4] flex items-center justify-center overflow-hidden">
            <div className="text-center px-8">
              <div className="w-24 h-24 rounded-full bg-brand-red/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-brand-red font-heading font-black text-3xl">SP</span>
              </div>
              <p className="text-white font-semibold">{t('about.founderTitle')}</p>
              <p className="text-brand-gray-muted text-sm">{t('about.founderRole')}</p>
            </div>
          </div>
          <div>
            <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-3">{t('about.founderLabel')}</p>
            <h2 className="text-3xl font-heading font-bold text-white mb-6">{t('about.founderTitle')}</h2>
            <div className="space-y-4 text-brand-gray-muted leading-relaxed">
              <p>{t('about.bio1')}</p>
              <p>{t('about.bio2')}</p>
              <p>{t('about.bio3')}</p>
            </div>
            <Link href="/book" className="btn-primary mt-8 inline-flex items-center gap-2">
              {t('about.bookWithSteven')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 bg-brand-gray/30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('about.missionLabel')}</p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6 leading-snug">
            {t('about.missionQuote')}
          </h2>
          <p className="text-brand-gray-muted text-lg leading-relaxed">
            {t('about.missionBody')}
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">{t('about.valuesTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 text-center">
                <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-brand-red" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 bg-brand-gray/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">{t('about.timelineTitle')}</h2>
          </div>
          <div className="space-y-8">
            {timeline.map(({ year, event }) => (
              <div key={year} className="flex gap-6">
                <div className="shrink-0 w-14 text-right">
                  <span className="text-brand-red font-heading font-bold">{year}</span>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-brand-red mt-1.5 shrink-0" />
                  <div className="w-px flex-1 bg-brand-red/20 mt-1" />
                </div>
                <p className="text-brand-gray-muted leading-relaxed pb-4">{event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title mb-4">{t('about.ctaTitle')}</h2>
          <p className="text-brand-gray-muted mb-8">
            {t('about.ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book" className="btn-primary flex items-center justify-center gap-2">
              {t('about.bookSession')} <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn-outline">{t('about.getInTouch')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
