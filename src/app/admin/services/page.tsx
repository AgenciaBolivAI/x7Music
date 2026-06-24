'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServices, createService, updateService, Service } from '@/api/serviceApi';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY: Partial<Service> = {
  title: '', slug: '', description: '', duration: 60, price: 0, isActive: true, order: 0,
};

const slugify = (str: string) =>
  str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const AdminServicesPage = () => {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing]   = useState<Partial<Service> | null>(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const res = await getServices(true);
      setServices(res.data.services);
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (s: Service) => { setEditing({ ...s }); setIsNew(false); };
  const close    = () => { setEditing(null); setIsNew(false); };

  const set = (k: keyof Service, v: unknown) =>
    setEditing((prev) => {
      const next: Partial<Service> = { ...prev!, [k]: v };
      if (k === 'title' && isNew) next.slug = slugify(v as string);
      if (k === 'price') next.isFree = (v as number) === 0;
      return next;
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast.error('Title is required'); return; }
    if (!editing.slug?.trim())  { toast.error('Slug is required'); return; }
    setSaving(true);
    try {
      if (isNew) { await createService(editing); toast.success('Service created'); }
      else       { await updateService(editing._id!, editing); toast.success('Service updated'); }
      await load();
      close();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: Service) => {
    try {
      await updateService(s._id, { isActive: !s.isActive });
      toast.success(s.isActive ? 'Service deactivated' : 'Service activated');
      await load();
    } catch { toast.error('Update failed'); }
  };

  const formatPrice = (cents: number) =>
    cents === 0 ? t('common.free') : `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">{t('admin.services.title')}</h1>
          <p className="text-brand-gray-muted mt-1">{t('admin.services.subtitle')}</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t('admin.services.addService')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((s) => (
            <div key={s._id} className={`card p-5 flex items-start justify-between gap-4 ${!s.isActive ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="text-white font-semibold text-lg">{s.title}</h3>
                  {s.isFree && <span className="badge-confirmed">{t('common.free')}</span>}
                  {!s.isActive && <span className="badge-cancelled">{t('common.inactive')}</span>}
                </div>
                <p className="text-brand-gray-muted text-sm mb-3 line-clamp-2">{s.description}</p>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1 text-brand-gray-muted"><Clock size={13} /> {s.duration} {t('common.min')}</span>
                  <span className="flex items-center gap-1 text-brand-gray-muted"><DollarSign size={13} /> {formatPrice(s.price)}</span>
                  <span className="text-brand-gray-muted font-mono text-xs">/{s.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(s)} className="btn-ghost p-2" title={s.isActive ? 'Deactivate' : 'Activate'}>
                  {s.isActive
                    ? <ToggleRight size={20} className="text-green-400" />
                    : <ToggleLeft  size={20} className="text-brand-gray-muted" />}
                </button>
                <button onClick={() => openEdit(s)} className="btn-ghost p-2"><Pencil size={16} /></button>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="text-center py-16 text-brand-gray-muted">
              {t('admin.services.noServices')}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-heading font-bold text-white mb-6">
              {isNew ? t('admin.services.addService') : t('admin.services.editService')}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Title</label>
                <input value={editing.title || ''} onChange={(e) => set('title', e.target.value)} className="input" placeholder="1hr Consultation" />
              </div>
              <div>
                <label className="label">Slug <span className="text-brand-gray-muted font-normal text-xs">{t('admin.services.slugNote')}</span></label>
                <input value={editing.slug || ''} onChange={(e) => set('slug', e.target.value)} className="input font-mono" placeholder="1hr-consultation" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={editing.description || ''} onChange={(e) => set('description', e.target.value)}
                  className="input min-h-[80px] resize-y" placeholder="Describe what this session covers..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('admin.services.duration')}</label>
                  <input type="number" min={5} max={480} value={editing.duration ?? 60}
                    onChange={(e) => set('duration', parseInt(e.target.value) || 0)} className="input" />
                </div>
                <div>
                  <label className="label">{t('admin.services.price')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-muted">$</span>
                    <input type="number" min={0} step={0.01}
                      value={editing.price !== undefined ? (editing.price / 100).toFixed(2) : '0.00'}
                      onChange={(e) => set('price', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className="input pl-7" />
                  </div>
                  {editing.price === 0 && <p className="text-xs text-green-400 mt-1">{t('admin.services.isFree')}</p>}
                </div>
              </div>
              <div>
                <label className="label">{t('admin.services.displayOrder')} <span className="text-brand-gray-muted font-normal text-xs">{t('admin.services.displayOrderNote')}</span></label>
                <input type="number" min={0} value={editing.order ?? 0}
                  onChange={(e) => set('order', parseInt(e.target.value) || 0)} className="input" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editing.isActive ?? true}
                  onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 accent-brand-red" />
                <span className="text-sm text-gray-300">{t('admin.services.isActive')}</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? t('admin.availability.saving') : isNew ? t('admin.services.createService') : t('admin.services.saveChanges')}
              </button>
              <button onClick={close} className="btn-outline flex-1">{t('admin.services.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesPage;
