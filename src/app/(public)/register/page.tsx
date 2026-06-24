'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const RegisterPage = () => {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', phone: '', company: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { first_name: form.firstName, last_name: form.lastName } },
      });
      if (error) { toast.error(error.message || 'Registration failed'); return; }

      // If email confirmation is required, there's no session yet.
      if (!data.session) {
        toast.success('Account created! Check your email to confirm, then log in.');
        router.replace('/login');
        return;
      }

      // Logged in immediately — save the optional profile fields.
      if (form.company || form.phone) {
        await supabase.from('profiles')
          .update({ company: form.company || null, phone: form.phone || null })
          .eq('id', data.user!.id);
      }
      await refresh();
      toast.success(`Welcome to X7, ${form.firstName}!`);
      router.replace('/portal');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-hero-gradient">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-red rounded-xl flex items-center justify-center mx-auto mb-4">
            <Music size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">{t('auth.createAccount')}</h1>
          <p className="text-brand-gray-muted mt-2">{t('auth.registerSubtitle')}</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('auth.firstName')}</label>
                <input type="text" value={form.firstName} onChange={set('firstName')} className="input" placeholder="Steven" required />
              </div>
              <div>
                <label className="label">{t('auth.lastName')}</label>
                <input type="text" value={form.lastName} onChange={set('lastName')} className="input" placeholder="Pantojas" required />
              </div>
            </div>

            <div>
              <label className="label">{t('auth.email')}</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label className="label">{t('auth.artistLabelOptional')}</label>
              <input type="text" value={form.company} onChange={set('company')} className="input" placeholder="Your artist or label name" />
            </div>

            <div>
              <label className="label">{t('auth.phoneOptional')}</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="+1 (787) 000-0000" />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="input pr-11"
                  placeholder={t('auth.minChars')}
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-muted hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('auth.creatingAccount')}
                </span>
              ) : t('auth.register')}
            </button>
          </form>

          <p className="text-center text-brand-gray-muted text-sm mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-brand-red hover:underline">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
