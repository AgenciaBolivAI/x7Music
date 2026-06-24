'use client';

import { useState } from 'react';
import { Mail, Instagram, Facebook, CheckCircle } from 'lucide-react';
import { submitMessage } from '@/api/messageApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    senderName: '',
    senderEmail: '',
    subject: '',
    body: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitMessage(form);
      setSubmitted(true);
    } catch {
      setError(t('contact.sentError'));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Contact" description="Contact X7 Music Group. Send a message, ask about booking, or inquire about publishing and consulting services. We respond within 24–48 hours." url="/contact" />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-16 px-4 text-center">
        <h1 className="section-title mb-4">{t('contact.heroTitle')}</h1>
        <p className="text-brand-gray-muted max-w-xl mx-auto">
          {t('contact.heroSubtitle')}
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Contact info */}
        <div>
          <h2 className="text-xl font-heading font-bold text-white mb-6">{t('contact.getInTouch')}</h2>
          <div className="space-y-4 mb-8">
            <a
              href="mailto:info@x7musicgroup.com"
              className="flex items-center gap-3 text-brand-gray-muted hover:text-brand-red transition-colors"
            >
              <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{t('contact.directEmail')}</p>
                <p className="text-brand-gray-muted text-sm">info@x7musicgroup.com</p>
              </div>
            </a>
            <a
              href="https://instagram.com/x7musicgroup"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-brand-gray-muted hover:text-brand-red transition-colors"
            >
              <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                <Instagram size={18} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Instagram</p>
                <p className="text-brand-gray-muted text-sm">@x7musicgroup</p>
              </div>
            </a>
            <a
              href="https://facebook.com/x7musicgroup"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-brand-gray-muted hover:text-brand-red transition-colors"
            >
              <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                <Facebook size={18} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Facebook</p>
                <p className="text-brand-gray-muted text-sm">@x7musicgroup</p>
              </div>
            </a>
          </div>

          <div className="card p-5">
            <p className="text-white font-medium mb-2">{t('contact.readyToBook')}</p>
            <p className="text-brand-gray-muted text-sm mb-4">
              {t('contact.readyToBookDesc')}
            </p>
            <a href="/book" className="btn-primary text-sm inline-block">{t('nav.bookSession')}</a>
          </div>
        </div>

        {/* Contact form */}
        <div>
          {submitted ? (
            <div className="card p-8 text-center">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-heading font-bold text-xl mb-2">{t('contact.sentSuccess')}</h3>
              <p className="text-brand-gray-muted">
                {t('contact.sentSuccessBody')}
              </p>
              <button className="btn-outline mt-6" onClick={() => { setSubmitted(false); setForm({ senderName: '', senderEmail: '', subject: '', body: '' }); }}>
                {t('contact.sentAnother')}
              </button>
            </div>
          ) : (
            <div className="card p-6">
              <h2 className="text-lg font-heading font-semibold text-white mb-5">{t('contact.sendMessage')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('contact.name')} *</label>
                  <input className="input w-full" required value={form.senderName}
                    onChange={(e) => set('senderName', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('contact.email')} *</label>
                  <input type="email" className="input w-full" required value={form.senderEmail}
                    onChange={(e) => set('senderEmail', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('contact.subject')} *</label>
                  <input className="input w-full" required value={form.subject}
                    onChange={(e) => set('subject', e.target.value)}
                    placeholder={t('contact.subjectPlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('contact.message')} *</label>
                  <textarea className="input w-full resize-none" rows={5} required value={form.body}
                    onChange={(e) => set('body', e.target.value)} />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? t('contact.sending') : t('contact.sendButton')}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
