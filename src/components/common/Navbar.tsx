'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Music, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import clsx from 'clsx';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/about', label: t('nav.about') },
    { to: '/artist', label: t('nav.artist') },
    { to: '/events', label: t('nav.events') },
    { to: '/music', label: t('nav.music') },
    { to: '/nextep', label: t('nav.nextep') },
    { to: '/checkzone', label: t('nav.checkzone') },
    { to: '/x7-meeting', label: t('nav.x7meeting') },
    { to: '/publishing', label: t('nav.publishing') },
  ];

  const linkClass = (to: string) =>
    clsx(
      'text-sm font-medium transition-colors duration-200 hover:text-brand-red',
      (to === '/' ? pathname === '/' : pathname.startsWith(to)) ? 'text-brand-red' : 'text-gray-300'
    );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-black/90 backdrop-blur-md border-b border-brand-gray-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center">
              <Music size={16} className="text-white" />
            </div>
            <span className="font-heading font-bold text-white text-lg">X7 MUSIC GROUP</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            {navLinks.map((link) => (
              <Link key={link.to} href={link.to} className={linkClass(link.to)}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="text-xs font-mono text-brand-gray-muted hover:text-white border border-brand-gray-light rounded px-2 py-1 transition-colors"
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>

            <Link href="/book" className="btn-primary py-2 text-sm">
              {t('nav.bookSession')}
            </Link>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-brand-gray-light rounded-full flex items-center justify-center">
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User size={14} className="text-brand-gray-muted" />
                    )}
                  </div>
                  <span>{user?.firstName}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 card shadow-xl py-1">
                    {isAdmin ? (
                      <button
                        onClick={() => { router.push('/admin'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-brand-gray-light transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        {t('nav.adminPanel')}
                      </button>
                    ) : (
                      <button
                        onClick={() => { router.push('/portal'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-brand-gray-light transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        {t('nav.myPortal')}
                      </button>
                    )}
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-brand-red hover:bg-brand-gray-light transition-colors"
                    >
                      <LogOut size={14} />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-ghost text-sm">
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-gray-300 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden bg-brand-gray border-t border-brand-gray-light px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              className={linkClass(link.to)}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/book" className="btn-primary text-sm w-full text-center" onClick={() => setIsOpen(false)}>
            {t('nav.bookSession')}
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href={isAdmin ? '/admin' : '/portal'}
                className="btn-ghost text-sm w-full text-center"
                onClick={() => setIsOpen(false)}
              >
                {isAdmin ? t('nav.adminPanel') : t('nav.myPortal')}
              </Link>
              <button onClick={() => { logout(); setIsOpen(false); }} className="text-sm text-brand-red text-left">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-ghost text-sm" onClick={() => setIsOpen(false)}>
              {t('nav.login')}
            </Link>
          )}
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="text-xs font-mono text-brand-gray-muted hover:text-white border border-brand-gray-light rounded px-2 py-1 self-start transition-colors"
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
