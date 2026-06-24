'use client';

import { useEffect, useState } from 'react';
import { Brain, Plus, Trash2, Sparkles } from 'lucide-react';
import { getBrain, addBrainChunk, deleteBrainChunk, type BrainChunk } from '@/api/agentApi';
import { useLanguage } from '@/context/LanguageContext';

const SOURCE_TYPES = ['knowledge', 'faq', 'decision', 'policy', 'music-business'];

export default function AdminBrainPage() {
  const { t } = useLanguage();
  const [chunks, setChunks] = useState<BrainChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', sourceType: 'knowledge', visibility: 'public', tags: '' });

  const load = () => {
    setLoading(true);
    getBrain()
      .then((res) => setChunks(res.data.chunks))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addBrainChunk({
        title: form.title.trim(),
        content: form.content.trim(),
        sourceType: form.sourceType,
        visibility: form.visibility as 'public' | 'internal',
        tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      });
      setForm({ title: '', content: '', sourceType: 'knowledge', visibility: 'public', tags: '' });
      load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('admin.brain.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.brain.confirmDelete'))) return;
    await deleteBrainChunk(id).catch(() => {});
    setChunks((prev) => prev.filter((c) => c._id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={22} className="text-brand-red" />
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.brain.title')}</h1>
      </div>
      <p className="text-brand-gray-muted text-sm mb-1">{t('admin.brain.subtitle')}</p>
      <p className="text-brand-gray-muted text-xs mb-6 flex items-center gap-1.5">
        <Sparkles size={11} /> {t('agent.poweredBy')}
      </p>

      {/* Add knowledge */}
      <form onSubmit={handleAdd} className="card p-6 mb-8 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-white">{t('admin.brain.addTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="label">{t('admin.brain.entryTitle')}</label>
            <input className="input w-full" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. How X7 handles MLC registration" />
          </div>
          <div>
            <label className="label">{t('admin.brain.type')}</label>
            <select className="input w-full" value={form.sourceType}
              onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
              {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('admin.brain.visibility')}</label>
            <select className="input w-full" value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="public">{t('admin.brain.visPublic')}</option>
              <option value="internal">{t('admin.brain.visInternal')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t('admin.brain.content')}</label>
          <textarea className="input w-full resize-none" rows={5} value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={t('admin.brain.contentPlaceholder')} />
        </div>
        <div>
          <label className="label">{t('admin.brain.tags')}</label>
          <input className="input w-full text-sm" value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="publishing, royalties, mlc" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary flex items-center gap-2" disabled={saving || !form.title.trim() || !form.content.trim()}>
          <Plus size={16} /> {saving ? t('admin.brain.saving') : t('admin.brain.add')}
        </button>
      </form>

      {/* Stored knowledge */}
      <h2 className="text-lg font-heading font-semibold text-white mb-3">
        {t('admin.brain.stored')} ({chunks.length})
      </h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chunks.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray-muted">
          <Brain size={34} className="mx-auto mb-3" />
          {t('admin.brain.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {chunks.map((c) => (
            <div key={c._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{c.title}</p>
                    <span className="text-[10px] uppercase tracking-wide text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">{c.sourceType}</span>
                    {c.visibility === 'internal' && (
                      <span className="text-[10px] uppercase tracking-wide text-brand-gray-muted bg-brand-gray-light px-2 py-0.5 rounded-full">{t('admin.brain.visInternal')}</span>
                    )}
                  </div>
                  <p className="text-brand-gray-muted text-sm line-clamp-3 whitespace-pre-wrap">{c.content}</p>
                  {c.tags?.length > 0 && (
                    <p className="text-brand-gray-muted text-xs mt-2">{c.tags.map((tg) => `#${tg}`).join(' ')}</p>
                  )}
                </div>
                <button className="text-red-400 hover:text-red-300 shrink-0" onClick={() => handleDelete(c._id)} title={t('common.delete')}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
