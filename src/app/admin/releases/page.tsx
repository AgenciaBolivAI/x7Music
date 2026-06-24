'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Image, Star, Eye, EyeOff } from 'lucide-react';
import {
  getReleases,
  createRelease,
  updateRelease,
  deleteRelease,
  type Release,
} from '@/api/releaseApi';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY_FORM = {
  title: '', artist: '', type: 'single' as Release['type'],
  releaseDate: '', description: '',
  isFeatured: false, isPublished: false,
  'streamingLinks.spotify': '',
  'streamingLinks.appleMusic': '',
  'streamingLinks.youtube': '',
  'streamingLinks.amazonMusic': '',
  'streamingLinks.tidal': '',
};

type FormState = typeof EMPTY_FORM;

const buildFormData = (form: FormState, file: File | null): FormData => {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
  if (file) fd.append('coverArt', file);
  return fd;
};

export default function AdminReleasesPage() {
  const { t } = useLanguage();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getReleases(true)
      .then((res) => setReleases(res.data.releases))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setCoverPreview(null);
    setShowForm(true);
  };

  const openEdit = (r: Release) => {
    setEditing(r);
    setForm({
      title: r.title,
      artist: r.artist,
      type: r.type,
      releaseDate: r.releaseDate ? r.releaseDate.slice(0, 10) : '',
      description: r.description ?? '',
      isFeatured: r.isFeatured,
      isPublished: r.isPublished,
      'streamingLinks.spotify': r.streamingLinks?.spotify ?? '',
      'streamingLinks.appleMusic': r.streamingLinks?.appleMusic ?? '',
      'streamingLinks.youtube': r.streamingLinks?.youtube ?? '',
      'streamingLinks.amazonMusic': r.streamingLinks?.amazonMusic ?? '',
      'streamingLinks.tidal': r.streamingLinks?.tidal ?? '',
    });
    setCoverFile(null);
    setCoverPreview(r.coverArtUrl ? null : null);
    setShowForm(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = buildFormData(form, coverFile);
      if (editing) {
        const res = await updateRelease(editing._id, fd);
        setReleases((prev) => prev.map((r) => (r._id === editing._id ? res.data.release : r)));
      } else {
        const res = await createRelease(fd);
        setReleases((prev) => [res.data.release, ...prev]);
      }
      setShowForm(false);
    } catch {
      alert('Failed to save release.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this release?')) return;
    await deleteRelease(id).catch(() => {});
    setReleases((prev) => prev.filter((r) => r._id !== id));
  };

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.releases.title')}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} /> {t('admin.releases.addRelease')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-heading font-semibold text-white mb-5">
            {editing ? t('admin.releases.editRelease') : t('admin.releases.newRelease')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Title *</label>
                <input className="input w-full" required value={form.title}
                  onChange={(e) => set('title', e.target.value)} />
              </div>
              <div>
                <label className="label">Artist *</label>
                <input className="input w-full" required value={form.artist}
                  onChange={(e) => set('artist', e.target.value)} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input w-full" value={form.type}
                  onChange={(e) => set('type', e.target.value)}>
                  <option value="single">Single</option>
                  <option value="ep">EP</option>
                  <option value="album">Album</option>
                </select>
              </div>
              <div>
                <label className="label">Release Date *</label>
                <input type="date" className="input w-full" required value={form.releaseDate}
                  onChange={(e) => set('releaseDate', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea className="input w-full resize-none" rows={3} value={form.description}
                onChange={(e) => set('description', e.target.value)} />
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

            {/* Cover Art */}
            <div>
              <label className="label">{t('admin.releases.coverArt')}</label>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {coverPreview || editing?.coverArtUrl ? (
                  <img
                    src={coverPreview ?? editing?.coverArtUrl}
                    alt="Cover"
                    className="w-32 h-32 object-cover rounded-lg mx-auto"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-brand-gray-muted">
                    <Image size={32} />
                    <p className="text-sm">{t('admin.releases.clickToUpload')}</p>
                    <p className="text-xs">{t('admin.releases.imageFormats')}</p>
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
                  <Star size={14} /> {t('admin.releases.featured')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-brand-red w-4 h-4"
                  checked={form.isPublished}
                  onChange={(e) => set('isPublished', e.target.checked)} />
                <span className="text-white text-sm flex items-center gap-1.5">
                  <Eye size={14} /> {t('admin.releases.published')}
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? t('admin.releases.saveChanges') : t('admin.releases.createRelease')}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                {t('admin.releases.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Release Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : releases.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">{t('admin.releases.noReleases')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((r) => (
            <div key={r._id} className="card overflow-hidden">
              {r.coverArtUrl ? (
                <img src={r.coverArtUrl} alt={r.title} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-brand-gray-light flex items-center justify-center">
                  <Image size={40} className="text-brand-gray-muted" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white font-semibold leading-tight">{r.title}</p>
                  <div className="flex gap-1 shrink-0">
                    {r.isFeatured && <Star size={14} className="text-yellow-400" />}
                    {r.isPublished ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-brand-gray-muted" />}
                  </div>
                </div>
                <p className="text-brand-gray-muted text-sm">{r.artist} · {r.type}</p>
                <p className="text-brand-gray-muted text-xs mt-1">{new Date(r.releaseDate).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil size={12} /> {t('common.edit')}
                  </button>
                  <button
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5"
                    onClick={() => handleDelete(r._id)}
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
