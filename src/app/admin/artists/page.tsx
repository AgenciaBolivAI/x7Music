'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Image, Star, Eye, EyeOff } from 'lucide-react';
import {
  getArtists,
  createArtist,
  updateArtist,
  deleteArtist,
  type Artist,
} from '@/api/artistApi';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY_FORM = {
  name: '', slug: '', tagline: '', bio: '', order: '0',
  featuredVideoUrl: '', spotifyEmbedUrl: '',
  legalName: '', stageName: '', address: '', phone: '', country: '',
  pro: '', ipiNumber: '', publisherName: '', publisherIpi: '', contactEmail: '',
  isFeatured: false, isPublished: false,
  'streamingLinks.spotify': '',
  'streamingLinks.appleMusic': '',
  'streamingLinks.youtube': '',
  'streamingLinks.amazonMusic': '',
  'streamingLinks.tidal': '',
  'socialLinks.instagram': '',
  'socialLinks.facebook': '',
  'socialLinks.tiktok': '',
  'socialLinks.website': '',
};

type FormState = typeof EMPTY_FORM;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-');

const buildFormData = (form: FormState, file: File | null): FormData => {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
  if (file) fd.append('image', file);
  return fd;
};

export default function AdminArtistsPage() {
  const { t } = useLanguage();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getArtists(true)
      .then((res) => setArtists(res.data.artists))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (a: Artist) => {
    setEditing(a);
    setForm({
      name: a.name,
      slug: a.slug,
      tagline: a.tagline ?? '',
      bio: a.bio ?? '',
      order: String(a.order ?? 0),
      featuredVideoUrl: a.featuredVideoUrl ?? '',
      spotifyEmbedUrl: a.spotifyEmbedUrl ?? '',
      legalName: a.legalName ?? '',
      stageName: a.stageName ?? '',
      address: a.address ?? '',
      phone: a.phone ?? '',
      country: a.country ?? '',
      pro: a.pro ?? '',
      ipiNumber: a.ipiNumber ?? '',
      publisherName: a.publisherName ?? '',
      publisherIpi: a.publisherIpi ?? '',
      contactEmail: a.contactEmail ?? '',
      isFeatured: a.isFeatured,
      isPublished: a.isPublished,
      'streamingLinks.spotify': a.streamingLinks?.spotify ?? '',
      'streamingLinks.appleMusic': a.streamingLinks?.appleMusic ?? '',
      'streamingLinks.youtube': a.streamingLinks?.youtube ?? '',
      'streamingLinks.amazonMusic': a.streamingLinks?.amazonMusic ?? '',
      'streamingLinks.tidal': a.streamingLinks?.tidal ?? '',
      'socialLinks.instagram': a.socialLinks?.instagram ?? '',
      'socialLinks.facebook': a.socialLinks?.facebook ?? '',
      'socialLinks.tiktok': a.socialLinks?.tiktok ?? '',
      'socialLinks.website': a.socialLinks?.website ?? '',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = buildFormData(form, imageFile);
      if (editing) {
        const res = await updateArtist(editing._id, fd);
        setArtists((prev) => prev.map((a) => (a._id === editing._id ? res.data.artist : a)));
      } else {
        const res = await createArtist(fd);
        setArtists((prev) => [...prev, res.data.artist]);
      }
      setShowForm(false);
    } catch {
      alert('Failed to save artist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this artist?')) return;
    await deleteArtist(id).catch(() => {});
    setArtists((prev) => prev.filter((a) => a._id !== id));
  };

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.artists.title')}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} /> {t('admin.artists.addArtist')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-heading font-semibold text-white mb-5">
            {editing ? t('admin.artists.editArtist') : t('admin.artists.newArtist')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input className="input w-full" required value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: editing ? prev.slug : slugify(name),
                    }));
                  }} />
              </div>
              <div>
                <label className="label">Slug * {t('admin.services.slugNote')}</label>
                <input className="input w-full" required value={form.slug}
                  onChange={(e) => set('slug', e.target.value)} />
              </div>
              <div>
                <label className="label">Tagline</label>
                <input className="input w-full" placeholder="e.g. Producer / Worship Leader" value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('admin.services.displayOrder')} {t('admin.services.displayOrderNote')}</label>
                <input type="number" className="input w-full" value={form.order}
                  onChange={(e) => set('order', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Bio</label>
              <textarea className="input w-full resize-none" rows={5} value={form.bio}
                onChange={(e) => set('bio', e.target.value)} />
            </div>

            {/* Streaming Links */}
            <div>
              <p className="label mb-2">Streaming Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['streamingLinks.spotify', 'Spotify URL'],
                  ['streamingLinks.appleMusic', 'Apple Music URL'],
                  ['streamingLinks.youtube', 'YouTube URL'],
                  ['streamingLinks.amazonMusic', 'Amazon Music URL'],
                  ['streamingLinks.tidal', 'Tidal URL'],
                ] as [keyof FormState, string][]).map(([k, placeholder]) => (
                  <input key={k} className="input w-full text-sm" placeholder={placeholder}
                    value={form[k] as string}
                    onChange={(e) => set(k, e.target.value)} />
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <p className="label mb-2">Social Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['socialLinks.instagram', 'Instagram URL'],
                  ['socialLinks.facebook', 'Facebook URL'],
                  ['socialLinks.tiktok', 'TikTok URL'],
                  ['socialLinks.website', 'Website URL'],
                ] as [keyof FormState, string][]).map(([k, placeholder]) => (
                  <input key={k} className="input w-full text-sm" placeholder={placeholder}
                    value={form[k] as string}
                    onChange={(e) => set(k, e.target.value)} />
                ))}
              </div>
            </div>

            {/* Embeds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Featured YouTube Video</label>
                <input className="input w-full text-sm" placeholder="https://youtube.com/watch?v=…"
                  value={form.featuredVideoUrl}
                  onChange={(e) => set('featuredVideoUrl', e.target.value)} />
              </div>
              <div>
                <label className="label">Spotify Embed (artist/album/playlist URL)</label>
                <input className="input w-full text-sm" placeholder="https://open.spotify.com/artist/…"
                  value={form.spotifyEmbedUrl}
                  onChange={(e) => set('spotifyEmbedUrl', e.target.value)} />
              </div>
            </div>

            {/* Publishing / PRO + contact — used to auto-fill agreements & documents */}
            <div className="border border-white/10 rounded-lg p-4">
              <p className="label mb-3 flex items-center gap-1.5 text-brand-red">{t('admin.artists.proSection')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('admin.artists.legalName')}</label>
                  <input className="input w-full text-sm" placeholder="Full legal name"
                    value={form.legalName} onChange={(e) => set('legalName', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.stageName')}</label>
                  <input className="input w-full text-sm" placeholder="Stage / artist name"
                    value={form.stageName} onChange={(e) => set('stageName', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">{t('admin.artists.address')}</label>
                  <input className="input w-full text-sm" placeholder="Street, city, state, ZIP"
                    value={form.address} onChange={(e) => set('address', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.phone')}</label>
                  <input className="input w-full text-sm" placeholder="+1 ..."
                    value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.country')}</label>
                  <input className="input w-full text-sm" placeholder="Country"
                    value={form.country} onChange={(e) => set('country', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.pro')}</label>
                  <select className="input w-full text-sm" value={form.pro}
                    onChange={(e) => set('pro', e.target.value)}>
                    <option value="">—</option>
                    <option value="ASCAP">ASCAP</option>
                    <option value="BMI">BMI</option>
                    <option value="SESAC">SESAC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('admin.artists.ipi')}</label>
                  <input className="input w-full text-sm" placeholder="IPI / CAE #"
                    value={form.ipiNumber} onChange={(e) => set('ipiNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.contactEmail')}</label>
                  <input className="input w-full text-sm" placeholder="email@example.com"
                    value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.publisherName')}</label>
                  <input className="input w-full text-sm" placeholder="Publisher / admin"
                    value={form.publisherName} onChange={(e) => set('publisherName', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('admin.artists.publisherIpi')}</label>
                  <input className="input w-full text-sm" placeholder="Publisher IPI #"
                    value={form.publisherIpi} onChange={(e) => set('publisherIpi', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="label">{t('admin.artists.photo')}</label>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview || editing?.imageUrl ? (
                  <img
                    src={imagePreview ?? editing?.imageUrl}
                    alt="Artist"
                    className="w-32 h-32 object-cover rounded-lg mx-auto"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-brand-gray-muted">
                    <Image size={32} />
                    <p className="text-sm">{t('admin.artists.clickToUpload')}</p>
                    <p className="text-xs">{t('admin.artists.imageFormats')}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-brand-red w-4 h-4"
                  checked={form.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)} />
                <span className="text-white text-sm flex items-center gap-1.5">
                  <Star size={14} /> {t('admin.artists.featured')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-brand-red w-4 h-4"
                  checked={form.isPublished}
                  onChange={(e) => set('isPublished', e.target.checked)} />
                <span className="text-white text-sm flex items-center gap-1.5">
                  <Eye size={14} /> {t('admin.artists.published')}
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? t('admin.artists.saveChanges') : t('admin.artists.createArtist')}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                {t('admin.artists.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Artist Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artists.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">{t('admin.artists.noArtists')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((a) => (
            <div key={a._id} className="card overflow-hidden">
              {a.imageUrl ? (
                <img src={a.imageUrl} alt={a.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-brand-gray-light flex items-center justify-center">
                  <Image size={40} className="text-brand-gray-muted" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white font-semibold leading-tight">{a.name}</p>
                  <div className="flex gap-1 shrink-0">
                    {a.isFeatured && <Star size={14} className="text-yellow-400" />}
                    {a.isPublished ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-brand-gray-muted" />}
                  </div>
                </div>
                {a.tagline && <p className="text-brand-gray-muted text-sm">{a.tagline}</p>}
                <p className="text-brand-gray-muted text-xs mt-1">/artist/{a.slug}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil size={12} /> {t('common.edit')}
                  </button>
                  <button
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5"
                    onClick={() => handleDelete(a._id)}
                  >
                    <Trash2 size={12} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
