'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Image, Star, Eye, EyeOff, MapPin, Link as LinkIcon } from 'lucide-react';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type Event,
} from '@/api/eventApi';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY_FORM = {
  title: '', slug: '', type: 'other' as Event['type'],
  description: '', longDescription: '',
  date: '', endDate: '', location: '', virtualLink: '', ticketLink: '',
  isFeatured: false, isPublished: false,
};

type FormState = typeof EMPTY_FORM;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);

const buildFormData = (form: FormState, file: File | null): FormData => {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
  if (file) fd.append('image', file);
  return fd;
};

export default function AdminEventsPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getEvents(true)
      .then((res) => setEvents(res.data.events))
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

  const openEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      slug: ev.slug,
      type: ev.type,
      description: ev.description ?? '',
      longDescription: ev.longDescription ?? '',
      date: ev.date ? ev.date.slice(0, 16) : '',
      endDate: ev.endDate ? ev.endDate.slice(0, 16) : '',
      location: ev.location ?? '',
      virtualLink: ev.virtualLink ?? '',
      ticketLink: ev.ticketLink ?? '',
      isFeatured: ev.isFeatured,
      isPublished: ev.isPublished,
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
        const res = await updateEvent(editing._id, fd);
        setEvents((prev) => prev.map((ev) => (ev._id === editing._id ? res.data.event : ev)));
      } else {
        const res = await createEvent(fd);
        setEvents((prev) => [res.data.event, ...prev]);
      }
      setShowForm(false);
    } catch {
      alert('Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await deleteEvent(id).catch(() => {});
    setEvents((prev) => prev.filter((ev) => ev._id !== id));
  };

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.events.title')}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} /> {t('admin.events.addEvent')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-heading font-semibold text-white mb-5">
            {editing ? t('admin.events.editEvent') : t('admin.events.newEvent')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Title *</label>
                <input className="input w-full" required value={form.title}
                  onChange={(e) => {
                    set('title', e.target.value);
                    if (!editing) set('slug', slugify(e.target.value));
                  }} />
              </div>
              <div>
                <label className="label">Slug</label>
                <input className="input w-full" value={form.slug}
                  onChange={(e) => set('slug', e.target.value)} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input w-full" value={form.type}
                  onChange={(e) => set('type', e.target.value)}>
                  <option value="spotlight">Spotlight</option>
                  <option value="worship">Night of Worship</option>
                  <option value="pinstage">Pinstage</option>
                  <option value="meeting">X7 Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Date & Time *</label>
                <input type="datetime-local" className="input w-full" required value={form.date}
                  onChange={(e) => set('date', e.target.value)} />
              </div>
              <div>
                <label className="label">End Date & Time</label>
                <input type="datetime-local" className="input w-full" value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)} />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input w-full" placeholder="City, Venue" value={form.location}
                  onChange={(e) => set('location', e.target.value)} />
              </div>
              <div>
                <label className="label">Virtual / Stream Link</label>
                <input className="input w-full" placeholder="https://..." value={form.virtualLink}
                  onChange={(e) => set('virtualLink', e.target.value)} />
              </div>
              <div>
                <label className="label">Ticket Link</label>
                <input className="input w-full" placeholder="https://..." value={form.ticketLink}
                  onChange={(e) => set('ticketLink', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Short Description</label>
              <textarea className="input w-full resize-none" rows={2} value={form.description}
                onChange={(e) => set('description', e.target.value)} />
            </div>

            <div>
              <label className="label">Full Description</label>
              <textarea className="input w-full resize-none" rows={4} value={form.longDescription}
                onChange={(e) => set('longDescription', e.target.value)} />
            </div>

            {/* Image upload */}
            <div>
              <label className="label">{t('admin.events.coverImage')}</label>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview || editing?.imageUrl ? (
                  <img
                    src={imagePreview ?? editing?.imageUrl}
                    alt="Event"
                    className="max-h-48 object-contain rounded-lg mx-auto"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-brand-gray-muted">
                    <Image size={32} />
                    <p className="text-sm">{t('admin.events.clickToUpload')}</p>
                    <p className="text-xs">{t('admin.events.imageFormats')}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-brand-red w-4 h-4"
                  checked={form.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)} />
                <span className="text-white text-sm flex items-center gap-1.5"><Star size={14} /> {t('admin.events.featured')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-brand-red w-4 h-4"
                  checked={form.isPublished}
                  onChange={(e) => set('isPublished', e.target.checked)} />
                <span className="text-white text-sm flex items-center gap-1.5"><Eye size={14} /> {t('admin.events.published')}</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? t('admin.events.saveChanges') : t('admin.events.createEvent')}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                {t('admin.events.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">{t('admin.events.noEvents')}</div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev._id} className="card p-5 flex gap-4">
              {ev.imageUrl ? (
                <img src={ev.imageUrl} alt={ev.title} className="w-24 h-24 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-24 h-24 bg-brand-gray-light rounded-lg flex items-center justify-center shrink-0">
                  <Image size={24} className="text-brand-gray-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-white font-semibold">{ev.title}</p>
                    <p className="text-brand-gray-muted text-sm capitalize">{ev.type}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    {ev.isFeatured && <Star size={14} className="text-yellow-400" />}
                    {ev.isPublished ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-brand-gray-muted" />}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-gray-muted">
                  <span>{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  {ev.location && <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
                  {ev.virtualLink && <span className="flex items-center gap-1"><LinkIcon size={12} />Virtual</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => openEdit(ev)}>
                    <Pencil size={12} /> {t('common.edit')}
                  </button>
                  <button className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => handleDelete(ev._id)}>
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
