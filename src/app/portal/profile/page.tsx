'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/api/authApi';
import api from '@/api/axiosInstance';
import { useLanguage } from '@/context/LanguageContext';

export default function MyProfilePage() {
  const { t } = useLanguage();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    company: user?.company ?? '',
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      await updateMe(form);
      await refresh();
      setProfileMsg(t('portal.profile.profileUpdated'));
    } catch {
      setProfileErr('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwErr(t('portal.profile.passwordsNoMatch'));
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwErr('Password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg(t('portal.profile.passwordChanged'));
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwErr(msg || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-8">{t('portal.profile.title')}</h1>

      <div className="card p-6 mb-6">
        <h2 className="font-heading font-semibold text-white text-lg mb-5">{t('portal.profile.contactInfo')}</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('portal.profile.firstName')}</label>
              <input className="input w-full" value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('portal.profile.lastName')}</label>
              <input className="input w-full" value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('portal.profile.phone')}</label>
              <input className="input w-full" value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('portal.profile.company')}</label>
              <input className="input w-full" value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{t('portal.profile.email')}</label>
            <p className="text-brand-gray-muted text-sm">{user?.email} <span className="text-xs">{t('portal.profile.emailNote')}</span></p>
          </div>
          {profileMsg && <p className="text-green-400 text-sm">{profileMsg}</p>}
          {profileErr && <p className="text-red-400 text-sm">{profileErr}</p>}
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? t('portal.profile.saving') : t('portal.profile.saveChanges')}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-heading font-semibold text-white text-lg mb-5">{t('portal.profile.changePassword')}</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label">{t('portal.profile.currentPassword')}</label>
            <input type="password" className="input w-full" value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('portal.profile.newPassword')}</label>
            <input type="password" className="input w-full" value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('portal.profile.confirmPassword')}</label>
            <input type="password" className="input w-full" value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
          {pwMsg && <p className="text-green-400 text-sm">{pwMsg}</p>}
          {pwErr && <p className="text-red-400 text-sm">{pwErr}</p>}
          <button type="submit" className="btn-primary" disabled={savingPw}>
            {savingPw ? t('portal.profile.saving') : t('portal.profile.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
