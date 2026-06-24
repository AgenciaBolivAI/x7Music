'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, DollarSign, FileText, Globe, Music, Shield } from 'lucide-react';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

export default function PublishingPage() {
  const { t } = useLanguage();

  const faq = [
    { q: t('publishing.faq.q1'), a: t('publishing.faq.a1') },
    { q: t('publishing.faq.q2'), a: t('publishing.faq.a2') },
    { q: t('publishing.faq.q3'), a: t('publishing.faq.a3') },
    { q: t('publishing.faq.q4'), a: t('publishing.faq.a4') },
    { q: t('publishing.faq.q5'), a: t('publishing.faq.a5') },
  ];

  const services = [
    {
      icon: FileText,
      title: t('publishing.services.proTitle'),
      desc: t('publishing.services.proDesc'),
      bullets: [t('publishing.services.proBullet1'), t('publishing.services.proBullet2'), t('publishing.services.proBullet3')],
    },
    {
      icon: DollarSign,
      title: t('publishing.services.mlcTitle'),
      desc: t('publishing.services.mlcDesc'),
      bullets: [t('publishing.services.mlcBullet1'), t('publishing.services.mlcBullet2'), t('publishing.services.mlcBullet3')],
    },
    {
      icon: Globe,
      title: t('publishing.services.distTitle'),
      desc: t('publishing.services.distDesc'),
      bullets: [t('publishing.services.distBullet1'), t('publishing.services.distBullet2'), t('publishing.services.distBullet3')],
    },
    {
      icon: Shield,
      title: t('publishing.services.copyrightTitle'),
      desc: t('publishing.services.copyrightDesc'),
      bullets: [t('publishing.services.copyrightBullet1'), t('publishing.services.copyrightBullet2'), t('publishing.services.copyrightBullet3')],
    },
    {
      icon: Music,
      title: t('publishing.services.auditTitle'),
      desc: t('publishing.services.auditDesc'),
      bullets: [t('publishing.services.auditBullet1'), t('publishing.services.auditBullet2'), t('publishing.services.auditBullet3')],
    },
    {
      icon: FileText,
      title: t('publishing.services.adminTitle'),
      desc: t('publishing.services.adminDesc'),
      bullets: [t('publishing.services.adminBullet1'), t('publishing.services.adminBullet2'), t('publishing.services.adminBullet3')],
    },
  ];

  const steps = [
    { step: '01', title: t('publishing.steps.s01Title'), desc: t('publishing.steps.s01Desc') },
    { step: '02', title: t('publishing.steps.s02Title'), desc: t('publishing.steps.s02Desc') },
    { step: '03', title: t('publishing.steps.s03Title'), desc: t('publishing.steps.s03Desc') },
    { step: '04', title: t('publishing.steps.s04Title'), desc: t('publishing.steps.s04Desc') },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Publishing & Catalog Services" description="X7 Music Group offers PRO registration, MLC setup, copyright filing, distribution, and catalog auditing to help Christian artists collect every royalty they're owed." url="/publishing" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('publishing.label')}</p>
        <h1 className="section-title mb-6">{t('publishing.heroTitle')}</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('publishing.heroSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/book" className="btn-primary flex items-center justify-center gap-2">
            {t('publishing.bookConsult')} <ArrowRight size={16} />
          </Link>
          <Link href="/contact" className="btn-outline">{t('publishing.askQuestion')}</Link>
        </div>
      </section>

      {/* Why it matters */}
      <section className="py-16 px-4 bg-brand-red/5 border-y border-brand-red/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-heading font-bold text-white mb-4">
            {t('publishing.royaltiesTitle')}
          </h2>
          <p className="text-brand-gray-muted text-lg leading-relaxed max-w-3xl mx-auto">
            {t('publishing.royaltiesBody')}
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">{t('publishing.servicesTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(({ icon: Icon, title, desc, bullets }) => (
              <div key={title} className="card p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-brand-red" />
                  </div>
                  <h3 className="text-white font-semibold text-lg leading-tight pt-1">{title}</h3>
                </div>
                <p className="text-brand-gray-muted text-sm leading-relaxed mb-4">{desc}</p>
                <ul className="space-y-1.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-brand-gray-muted">
                      <CheckCircle size={14} className="text-brand-red mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 px-4 bg-brand-gray/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">{t('publishing.howTitle')}</h2>
            <p className="section-subtitle mt-2">{t('publishing.howSubtitle')}</p>
          </div>
          <div className="space-y-6">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-6">
                <div className="text-brand-red font-heading font-black text-3xl shrink-0 w-10 text-right leading-tight">{step}</div>
                <div className="card p-5 flex-1">
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-brand-gray-muted text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title">{t('publishing.faqTitle')}</h2>
          </div>
          <div className="space-y-4">
            {faq.map(({ q, a }) => (
              <div key={q} className="card p-6">
                <h3 className="text-white font-semibold mb-2">{q}</h3>
                <p className="text-brand-gray-muted text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-brand-red/10 border-y border-brand-red/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="section-title mb-4">{t('publishing.ctaTitle')}</h2>
          <p className="text-brand-gray-muted mb-8">
            {t('publishing.ctaSubtitle')}
          </p>
          <Link href="/book" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            {t('publishing.ctaButton')} <ArrowRight size={20} />
          </Link>
          <p className="text-brand-gray-muted text-sm mt-4">{t('publishing.ctaNote')}</p>
        </div>
      </section>
    </div>
  );
}
