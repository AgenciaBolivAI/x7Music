'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { getAdminResources, createResource, setResourceActive, deleteResource, type Resource } from '@/api/resourceApi';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminResourcesPage() {
  const { t } = useLanguage();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getAdminResources().then((res) => setResources(res.data.resources)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!form.title.trim() || !file) { setError(t('admin.resources.needFile')); return; }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category.trim());
      fd.append('file', file);
      const cover = coverRef.current?.files?.[0];
      if (cover) fd.append('cover', cover);
      await createResource(fd);
      setForm({ title: '', description: '', category: '' });
      if (fileRef.current) fileRef.current.value = '';
      if (coverRef.current) coverRef.current.value = '';
      load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('admin.resources.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: Resource) => {
    await setResourceActive(r._id, !r.isActive).catch(() => {});
    setResources((prev) => prev.map((x) => (x._id === r._id ? { ...x, isActive: !x.isActive } : x)));
  };

  const remove = async (id: string) => {
    if (!confirm(t('admin.resources.confirmDelete'))) return;
    await deleteResource(id).catch(() => {});
    setResources((prev) => prev.filter((r) => r._id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-1">{t('admin.resources.title')}</h1>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.resources.subtitle')}</p>

      <form onSubmit={handleCreate} className="card p-6 mb-8 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-white">{t('admin.resources.addTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">{t('admin.resources.guideTitle')}</label>
            <input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Guía de Derechos de Autor" />
          </div>
          <div>
            <label className="label">{t('admin.resources.category')}</label>
            <input className="input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Publishing" />
          </div>
        </div>
        <div>
          <label className="label">{t('admin.resources.description')}</label>
          <textarea className="input w-full resize-none" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('admin.resources.file')}</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="text-sm text-brand-gray-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-brand-red file:text-white" />
          </div>
          <div>
            <label className="label">{t('admin.resources.cover')}</label>
            <input ref={coverRef} type="file" accept="image/*" className="text-sm text-brand-gray-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-brand-gray-light file:text-white" />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <Plus size={16} /> {saving ? t('admin.resources.uploading') : t('admin.resources.add')}
        </button>
      </form>

      <h2 className="text-lg font-heading font-semibold text-white mb-3">{t('admin.resources.published')} ({resources.length})</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray-muted">
          <FileText size={34} className="mx-auto mb-3" />
          {t('admin.resources.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r._id} className="card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{r.title}</p>
                  {!r.isActive && <span className="text-[10px] text-brand-gray-muted bg-brand-gray-light px-2 py-0.5 rounded-full">{t('admin.resources.hidden')}</span>}
                </div>
                <p className="text-brand-gray-muted text-xs mt-0.5 flex items-center gap-1.5">
                  <Download size={11} /> {r.downloadCount ?? 0} {t('admin.resources.leads')}
                  {r.category ? ` · ${r.category}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(r)} className="text-brand-gray-muted hover:text-white" title={r.isActive ? t('admin.resources.hide') : t('admin.resources.show')}>
                  {r.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-gray-muted hover:text-white" title={t('common.view')}>
                    <FileText size={16} />
                  </a>
                )}
                <button onClick={() => remove(r._id)} className="text-red-400 hover:text-red-300" title={t('common.delete')}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
