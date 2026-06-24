'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Music, Mail, Send, Check } from 'lucide-react';
import { subscribeNewsletter } from '@/api/newsletterApi';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const quickLinks = [
    { to: '/about', label: t('nav.about') },
    { to: '/artist', label: t('footer.artists') },
    { to: '/events', label: t('nav.events') },
    { to: '/music', label: t('nav.music') },
    { to: '/nextep', label: t('nav.nextep') },
    { to: '/checkzone', label: t('nav.checkzone') },
    { to: '/resources', label: t('nav.resources') },
    { to: '/publishing', label: t('nav.publishing') },
    { to: '/book', label: t('nav.bookSession') },
    { to: '/contact', label: t('footer.contact') },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    try {
      await subscribeNewsletter({ email, language, source: 'footer' });
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer className="bg-brand-gray border-t border-brand-gray-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center">
                <Music size={16} className="text-white" />
              </div>
              <span className="font-heading font-bold text-white text-lg">X7 MUSIC GROUP</span>
            </div>
            <p className="text-brand-gray-muted text-sm leading-relaxed">
              {t('footer.desc')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h4>
            <div className="flex flex-col gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  className="text-sm text-brand-gray-muted hover:text-brand-red transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer.connect')}</h4>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:info@x7musicgroup.com"
                className="flex items-center gap-2 text-sm text-brand-gray-muted hover:text-brand-red transition-colors"
              >
                <Mail size={14} />
                info@x7musicgroup.com
              </a>
              <a
                href="https://instagram.com/x7musicgroup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand-gray-muted hover:text-brand-red transition-colors"
              >
                <Instagram size={14} />
                @x7musicgroup
              </a>
              <a
                href="https://facebook.com/x7musicgroup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand-gray-muted hover:text-brand-red transition-colors"
              >
                <Facebook size={14} />
                @x7musicgroup
              </a>
            </div>

            <div className="mt-6">
              <Link href="/book" className="btn-primary text-sm">
                {t('footer.bookFreeConsult')}
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer.newsletterTitle')}</h4>
            <p className="text-brand-gray-muted text-sm leading-relaxed mb-4">
              {t('footer.newsletterDesc')}
            </p>
            {status === 'done' ? (
              <p className="text-green-400 text-sm flex items-center gap-2">
                <Check size={15} /> {t('footer.subscribed')}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.emailPlaceholder')}
                  className="input text-sm py-2 flex-1 min-w-0"
                />
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn-primary px-3 py-2 shrink-0"
                  aria-label={t('footer.subscribe')}
                >
                  <Send size={15} />
                </button>
              </form>
            )}
            {status === 'error' && (
              <p className="text-red-400 text-xs mt-2">{t('footer.subscribeError')}</p>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-brand-gray-light flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-brand-gray-muted text-xs">
            © {new Date().getFullYear()} X7 Music Group LLC. {t('footer.allRightsReserved')}
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="text-xs text-brand-gray-muted hover:text-white transition-colors">
              {t('footer.clientLogin')}
            </Link>
            <Link href="/register" className="text-xs text-brand-gray-muted hover:text-white transition-colors">
              {t('footer.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
