'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';

const ForgotPasswordPage = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      // Always show success (don't reveal whether the email exists).
      setSent(true);
      toast.success('Check your email for a reset link');
    } catch {
      setSent(true); // still don't leak existence
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-heading font-bold text-white mb-2">{t('auth.resetPassword')}</h1>
        <p className="text-brand-gray-muted mb-8">{t('auth.forgotSubtitle')}</p>

        {sent ? (
          <div className="card p-8 text-center">
            <p className="text-green-400 font-semibold mb-4">{t('auth.resetLinkSent')}</p>
            <p className="text-brand-gray-muted text-sm mb-6">{t('auth.checkInbox')}</p>
            <Link href="/login" className="text-brand-red hover:underline text-sm">{t('auth.backToLogin')}</Link>
          </div>
        ) : (
          <div className="card p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="label">{t('auth.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? t('auth.sending') : t('auth.sendReset')}
              </button>
            </form>
            <p className="text-center mt-4">
              <Link href="/login" className="text-sm text-brand-gray-muted hover:text-brand-red transition-colors">
                {t('auth.backToLogin')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
