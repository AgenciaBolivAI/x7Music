'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  type AgreementTemplate, type TemplateField, type AgreementType,
} from '@/api/agreementApi';
import { useLanguage } from '@/context/LanguageContext';

interface Form {
  name: string; category: AgreementType; description: string; body: string;
  fields: TemplateField[]; isActive: boolean;
}
const blank: Form = { name: '', category: 'split_sheet', description: '', body: '', fields: [], isActive: true };

export default function AgreementTemplatesPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(blank);

  const load = () => getTemplates().then((r) => setTemplates(r.data.templates)).catch(() => toast.error(t('admin.agreements.loadError')));
  useEffect(() => { load().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  const edit = (tpl: AgreementTemplate) => {
    setEditingId(tpl._id);
    setForm({ name: tpl.name, category: tpl.category, description: tpl.description ?? '', body: tpl.body, fields: tpl.fields ?? [], isActive: tpl.isActive });
  };
  const startNew = () => { setEditingId('new'); setForm({ ...blank, body: DEFAULT_BODY }); };

  const setField = (i: number, patch: Partial<TemplateField>) => setForm((f) => ({ ...f, fields: f.fields.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));

  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) return toast.error(t('admin.agreements.templates.needNameBody'));
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), category: form.category, description: form.description.trim() || undefined, body: form.body, fields: form.fields.filter((f) => f.key.trim()), isActive: form.isActive };
      if (editingId === 'new') await createTemplate(payload);
      else if (editingId) await updateTemplate(editingId, payload);
      toast.success(t('admin.agreements.templates.saved'));
      setEditingId(null);
      load();
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('admin.agreements.saveError'));
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(t('admin.agreements.templates.confirmDelete'))) return;
    await deleteTemplate(id).catch(() => {});
    setTemplates((prev) => prev.filter((x) => x._id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/agreements" className="text-brand-gray-muted hover:text-white text-sm flex items-center gap-1.5 mb-3"><ArrowLeft size={15} /> {t('admin.agreements.title')}</Link>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-heading font-bold text-white">{t('admin.agreements.templates.title')}</h1>
        {editingId === null && <button className="btn-primary text-sm flex items-center gap-1.5" onClick={startNew}><Plus size={15} /> {t('admin.agreements.templates.new')}</button>}
      </div>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.agreements.templates.subtitle')}</p>

      {editingId !== null ? (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">{t('admin.agreements.templates.name')}</label><input className="input w-full text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">{t('admin.agreements.templates.category')}</label>
              <select className="input w-full text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AgreementType })}>
                <option value="split_sheet">Split Sheet</option>
                <option value="distribution_agreement">Distribution Agreement</option>
              </select>
            </div>
          </div>
          <div><label className="label">{t('admin.agreements.templates.description')}</label><input className="input w-full text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          {/* Merge fields */}
          <div>
            <label className="label">{t('admin.agreements.templates.fields')}</label>
            <div className="space-y-2">
              {form.fields.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input className="input text-sm col-span-3" placeholder="key" value={f.key} onChange={(e) => setField(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, '') })} />
                  <input className="input text-sm col-span-5" placeholder="Label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                  <input className="input text-sm col-span-3" placeholder="default" value={f.default ?? ''} onChange={(e) => setField(i, { default: e.target.value })} />
                  <button className="col-span-1 text-red-400 hover:text-red-300 flex items-center justify-center" onClick={() => setForm((fm) => ({ ...fm, fields: fm.fields.filter((_, idx) => idx !== i) }))}><Trash2 size={14} /></button>
                </div>
              ))}
              <button className="btn-outline text-xs flex items-center gap-1" onClick={() => setForm((f) => ({ ...f, fields: [...f.fields, { key: '', label: '' }] }))}><Plus size={13} /> {t('admin.agreements.templates.addField')}</button>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="label">{t('admin.agreements.templates.body')}</label>
            <textarea className="input w-full text-sm font-mono leading-relaxed" rows={20} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <p className="text-brand-gray-muted text-xs mt-2 leading-relaxed">{t('admin.agreements.templates.help')}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-gray-muted"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> {t('admin.agreements.templates.active')}</label>

          <div className="flex items-center gap-3">
            <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={save}><Save size={16} /> {saving ? t('admin.agreements.saving') : t('admin.agreements.templates.save')}</button>
            <button className="text-brand-gray-muted hover:text-white text-sm" onClick={() => setEditingId(null)}>{t('admin.agreements.templates.cancel')}</button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div key={tpl._id} className="card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-brand-red shrink-0" />
                  <span className="text-white font-medium truncate">{tpl.name}</span>
                  {!tpl.isActive && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{t('admin.agreements.templates.inactive')}</span>}
                </div>
                {tpl.description && <p className="text-brand-gray-muted text-xs mt-0.5 truncate">{tpl.description}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button className="btn-outline text-xs px-3 py-1.5" onClick={() => edit(tpl)}>{t('admin.agreements.templates.editBtn')}</button>
                <button className="text-red-400 hover:text-red-300" onClick={() => remove(tpl._id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_BODY = `## {{empresa}}

# TÍTULO DEL DOCUMENTO

**Título:** {{titulo}}
**Fecha:** {{fecha}}

## SECCIÓN

Texto del acuerdo aquí…

{{TABLA}}

## FIRMAS

{{FIRMAS}}`;
