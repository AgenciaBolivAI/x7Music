'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, BadgeCheck } from 'lucide-react';
import { getServices, type Service } from '@/api/serviceApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function NextepPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.data.services))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="NEXTEP — Services" description="NEXTEP by X7 Music Group — consulting, publishing, and music business services that take your career to the next step." url="/nextep" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('nextep.heroLabel')}</p>
        <h1 className="text-5xl md:text-6xl font-heading font-black text-white mb-6">NEXTEP</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('nextep.heroSubtitle')}
        </p>
      </section>

      {/* Services */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="section-title">{t('nextep.servicesTitle')}</h2>
          <p className="text-brand-gray-muted mt-2">{t('nextep.servicesSubtitle')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {services.map((svc) => (
              <div key={svc._id} className="card p-6 flex flex-col hover:border-brand-red/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-white font-heading font-semibold text-lg">{svc.title}</h3>
                  <span className="text-brand-red font-bold shrink-0">
                    {svc.isFree ? t('common.free') : formatPrice(svc.price)}
                  </span>
                </div>
                <p className="text-brand-gray-muted text-sm leading-relaxed flex-1">{svc.description}</p>
                <div className="flex items-center justify-between mt-5">
                  <span className="text-brand-gray-muted text-xs flex items-center gap-1.5">
                    <Clock size={13} /> {svc.duration} {t('common.min')}
                  </span>
                  <Link href="/book" className="btn-primary text-sm flex items-center gap-1.5">
                    {t('nextep.bookNow')} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Why NEXTEP */}
      <section className="py-16 px-4 bg-brand-gray/30">
        <div className="max-w-3xl mx-auto text-center">
          <BadgeCheck size={36} className="text-brand-red mx-auto mb-4" />
          <h2 className="section-title mb-4">{t('nextep.whyTitle')}</h2>
          <p className="text-brand-gray-muted leading-relaxed mb-8">{t('nextep.whyBody')}</p>
          <Link href="/book" className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2">
            {t('nextep.ctaButton')} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
