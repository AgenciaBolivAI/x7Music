'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/api/authApi';
import api from '@/api/axiosInstance';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, refresh } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
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
      await updateMe(profileForm);
      await refresh();
      setProfileMsg(t('admin.settings.profileUpdated'));
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
      setPwErr(t('admin.settings.passwordsNoMatch'));
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
      setPwMsg(t('admin.settings.passwordChanged'));
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
      <h1 className="text-3xl font-heading font-bold text-white mb-8">{t('admin.settings.title')}</h1>

      {/* Profile */}
      <div className="card p-6 mb-6">
        <h2 className="font-heading font-semibold text-white text-lg mb-5">{t('admin.settings.profileSettings')}</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input w-full" value={profileForm.firstName}
                onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input w-full" value={profileForm.lastName}
                onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input type="email" className="input w-full" value={profileForm.email}
                onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input w-full" value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Company / Label</label>
              <input className="input w-full" value={profileForm.company}
                onChange={(e) => setProfileForm((p) => ({ ...p, company: e.target.value }))} />
            </div>
          </div>
          {profileMsg && <p className="text-green-400 text-sm">{profileMsg}</p>}
          {profileErr && <p className="text-red-400 text-sm">{profileErr}</p>}
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? t('admin.settings.saving') : t('admin.settings.saveProfile')}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="font-heading font-semibold text-white text-lg mb-5">{t('admin.settings.changePassword')}</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input w-full" value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input w-full" value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input w-full" value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
          {pwMsg && <p className="text-green-400 text-sm">{pwMsg}</p>}
          {pwErr && <p className="text-red-400 text-sm">{pwErr}</p>}
          <button type="submit" className="btn-primary" disabled={savingPw}>
            {savingPw ? t('admin.settings.saving') : t('admin.settings.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
