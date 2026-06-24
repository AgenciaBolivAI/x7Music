'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const LoginPage = () => {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message || 'Invalid credentials'); return; }

      // Route by role.
      const { data: { user } } = await supabase.auth.getUser();
      const { data: p } = await supabase.from('profiles').select('role, first_name').eq('id', user!.id).maybeSingle();
      await refresh();
      toast.success(`Welcome back${p?.first_name ? `, ${p.first_name}` : ''}!`);
      router.replace(p?.role === 'admin' ? '/admin' : '/portal');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 bg-hero-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-red rounded-xl flex items-center justify-center mx-auto mb-4">
            <Music size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">{t('auth.welcomeBack')}</h1>
          <p className="text-brand-gray-muted mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-1">
                <Link href="/forgot-password" className="text-xs text-brand-gray-muted hover:text-brand-red transition-colors">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('auth.signingIn')}
                </span>
              ) : t('auth.signIn')}
            </button>
          </form>

          <p className="text-center text-brand-gray-muted text-sm mt-6">
            {t('auth.dontHaveAccount')}{' '}
            <Link href="/register" className="text-brand-red hover:underline">
              {t('auth.createOneFree')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
