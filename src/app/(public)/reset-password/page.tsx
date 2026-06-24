'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';

// The email link lands on /auth/callback which exchanges the code for a recovery
// session, then redirects here — so updateUser() applies to the right account.
const ResetPasswordPage = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error('Reset link invalid or expired. Request a new one.'); return; }
      toast.success('Password reset! You can now log in.');
      router.push('/login');
    } catch {
      toast.error('Something went wrong. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-heading font-bold text-white mb-2">{t('auth.setNewPassword')}</h1>
        <div className="card p-8 mt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">{t('auth.newPassword')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder={t('auth.minChars')} required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('auth.resetting') : t('auth.resetPassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
