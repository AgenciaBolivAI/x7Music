'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Download, Send, FileText, Check, AlertTriangle, Link2, ChevronDown, PenLine, Settings2,
} from 'lucide-react';
import { getArtists, type Artist } from '@/api/artistApi';
import {
  getAgreements, createAgreement, deleteAgreement, sendAgreement, downloadAgreementPdf, getTemplates,
  type Agreement, type AgreementTemplate, type SignerInput,
} from '@/api/agreementApi';
import ArtistPicker from '@/components/admin/ArtistPicker';
import { useLanguage } from '@/context/LanguageContext';

interface Part {
  artistId?: string;
  name: string; email: string; phone: string; address: string;
  pro: string; ipi: string; publisher: string; publisherIpi: string;
  role: string; percentage: string;
}
const emptyPart = (): Part => ({ name: '', email: '', phone: '', address: '', pro: '', ipi: '', publisher: '', publisherIpi: '', role: 'Compositor', percentage: '' });

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300', sent: 'bg-blue-900/50 text-blue-300',
  partially_signed: 'bg-yellow-900/50 text-yellow-300', completed: 'bg-green-900/50 text-green-300',
  voided: 'bg-red-900/50 text-red-300',
};

export default function AdminAgreementsPage() {
  const { t } = useLanguage();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [list, setList] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [parts, setParts] = useState<Part[]>([emptyPart(), emptyPart()]);

  const template = templates.find((x) => x._id === templateId) || null;
  const needsTable = !!template?.body.includes('{{TABLA}}');

  useEffect(() => {
    Promise.all([getArtists(true), getTemplates(), getAgreements()])
      .then(([a, tpl, g]) => {
        setArtists(a.data.artists);
        const tpls = tpl.data.templates.filter((x) => x.isActive);
        setTemplates(tpls);
        setList(g.data.agreements);
        if (tpls[0]) selectTemplate(tpls[0], false);
      })
      .catch(() => toast.error(t('admin.agreements.loadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = (tpl: AgreementTemplate, reset = true) => {
    setTemplateId(tpl._id);
    const fv: Record<string, string> = {};
    tpl.fields.forEach((f) => { fv[f.key] = f.default ?? ''; });
    setFieldValues(fv);
    if (reset) setParts([emptyPart(), emptyPart()]);
    setTitle('');
  };

  const total = useMemo(() => parts.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0), [parts]);
  const totalOk = !needsTable || Math.round(total * 100) === 10000;

  const setPart = (i: number, patch: Partial<Part>) => setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const fillFromArtist = (i: number, a: Artist) => setPart(i, {
    artistId: a._id, name: a.legalName || a.name, email: a.contactEmail || '', phone: a.phone || '', address: a.address || '',
    pro: a.pro || '', ipi: a.ipiNumber || '', publisher: a.publisherName || '', publisherIpi: a.publisherIpi || '',
  });

  const refresh = () => getAgreements().then((g) => setList(g.data.agreements)).catch(() => {});

  const docTitle = () => title.trim() || fieldValues.titulo || fieldValues.artista || template?.name || 'Documento';

  const save = async () => {
    if (!template) return toast.error(t('admin.agreements.pickTemplate'));
    if (!parts.every((p) => p.name.trim() && p.email.trim())) return toast.error(t('admin.agreements.needNameEmail'));
    if (!totalOk) return toast.error(t('admin.agreements.need100'));
    setSaving(true);
    try {
      const data: Record<string, unknown> = { ...fieldValues };
      if (needsTable) {
        data.writers = parts.map((p) => ({ name: p.name.trim(), society: p.pro, ipi: p.ipi, publisher: p.publisher, publisherIpi: p.publisherIpi, percentage: parseFloat(p.percentage) || 0 }));
      }
      const signers: SignerInput[] = parts.map((p) => ({
        artistId: p.artistId, name: p.name.trim(), email: p.email.trim(), role: p.role || 'Firmante',
        phone: p.phone.trim() || undefined, address: p.address.trim() || undefined,
      }));
      await createAgreement({ type: template.category, templateId: template._id, title: docTitle(), data, signers });
      toast.success(t('admin.agreements.created'));
      selectTemplate(template, true);
      refresh();
    } catch (e) {
      toast.error(apiMsg(e) || t('admin.agreements.saveError'));
    } finally { setSaving(false); }
  };

  const handleSend = async (a: Agreement) => {
    const r = await sendAgreement(a._id).catch(() => null);
    if (!r) return toast.error(t('admin.agreements.saveError'));
    toast.success(t('admin.agreements.sentToast').replace('{n}', String(r.data.sent)));
    refresh();
  };
  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.agreements.confirmDelete'))) return;
    await deleteAgreement(id).catch(() => {});
    setList((prev) => prev.filter((x) => x._id !== id));
  };
  const copyLink = (token?: string) => {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`);
    toast.success(t('admin.agreements.copied'));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-2"><PenLine size={26} /> {t('admin.agreements.title')}</h1>
        <Link href="/admin/agreement-templates" className="btn-outline text-sm flex items-center gap-1.5"><Settings2 size={15} /> {t('admin.agreements.manageTemplates')}</Link>
      </div>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.agreements.subtitle')}</p>

      {/* Builder */}
      <div className="card p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">{t('admin.agreements.template')}</label>
            <select className="input w-full text-sm" value={templateId}
              onChange={(e) => { const tpl = templates.find((x) => x._id === e.target.value); if (tpl) selectTemplate(tpl); }}>
              {templates.length === 0 && <option value="">—</option>}
              {templates.map((tpl) => <option key={tpl._id} value={tpl._id}>{tpl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('admin.agreements.docTitle')}</label>
            <input className="input w-full text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={docTitle()} />
          </div>
        </div>

        {/* Template-defined fields */}
        {template && template.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {template.fields.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input className="input w-full text-sm" value={fieldValues[f.key] ?? ''} onChange={(e) => setFieldValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}

        {/* Participants / signers */}
        <p className="label mb-2">{t('admin.agreements.participants')}</p>
        <div className="space-y-4">
          {parts.map((p, i) => (
            <div key={i} className="rounded-lg border border-white/10 p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <ArtistPicker artists={artists} onPick={(a) => fillFromArtist(i, a)} placeholder={t('admin.agreements.pickArtist')} initial={p.name} />
                <input className="input text-sm" placeholder={t('admin.agreements.signerName')} value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} />
                <input className="input text-sm" placeholder="email@..." value={p.email} onChange={(e) => setPart(i, { email: e.target.value })} />
              </div>
              {needsTable && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input className="input text-sm" placeholder="PRO / Sociedad" value={p.pro} onChange={(e) => setPart(i, { pro: e.target.value })} />
                  <input className="input text-sm" placeholder="IPI" value={p.ipi} onChange={(e) => setPart(i, { ipi: e.target.value })} />
                  <input className="input text-sm" placeholder={t('admin.agreements.publisher')} value={p.publisher} onChange={(e) => setPart(i, { publisher: e.target.value })} />
                  <input className="input text-sm" placeholder="Publisher IPI" value={p.publisherIpi} onChange={(e) => setPart(i, { publisherIpi: e.target.value })} />
                  <input className="input text-sm text-right" type="number" min="0" max="100" placeholder="%" value={p.percentage} onChange={(e) => setPart(i, { percentage: e.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="input text-sm" placeholder={t('admin.agreements.role')} value={p.role} onChange={(e) => setPart(i, { role: e.target.value })} />
                <input className="input text-sm" placeholder={t('admin.agreements.phone')} value={p.phone} onChange={(e) => setPart(i, { phone: e.target.value })} />
                <input className="input text-sm" placeholder={t('admin.agreements.address')} value={p.address} onChange={(e) => setPart(i, { address: e.target.value })} />
              </div>
              {parts.length > 1 && (
                <button className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1" onClick={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 size={12} /> {t('admin.agreements.remove')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button className="btn-outline text-sm flex items-center gap-1.5" onClick={() => setParts((p) => [...p, emptyPart()])}><Plus size={14} /> {t('admin.agreements.addParticipant')}</button>
          {needsTable && (
            <div className={`text-sm font-semibold flex items-center gap-1.5 ${totalOk ? 'text-green-400' : 'text-red-400'}`}>
              {totalOk ? <Check size={15} /> : <AlertTriangle size={15} />} {t('admin.agreements.total')}: {Math.round(total * 100) / 100}%
            </div>
          )}
        </div>

        <button className="btn-primary flex items-center gap-2 mt-5" disabled={saving || !template} onClick={save}>
          <FileText size={16} /> {saving ? t('admin.agreements.saving') : t('admin.agreements.create')}
        </button>
      </div>

      {/* List */}
      <h2 className="text-lg font-heading font-semibold text-white mb-3">{t('admin.agreements.history')}</h2>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray-muted"><FileText size={34} className="mx-auto mb-3" />{t('admin.agreements.none')}</div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const signed = a.signers.filter((s) => s.status === 'signed').length;
            return (
              <div key={a._id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{a.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status]}`}>{t(`admin.agreements.status.${a.status}`)}</span>
                    </div>
                    <p className="text-brand-gray-muted text-xs mt-0.5">{signed}/{a.signers.length} {t('admin.agreements.signed')} · {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => downloadAgreementPdf(a._id, a.title)}><Download size={13} /> PDF</button>
                    {a.status !== 'completed' && <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => handleSend(a)}><Send size={13} /> {t('admin.agreements.send')}</button>}
                    <button className="text-brand-gray-muted hover:text-white" onClick={() => setExpanded(expanded === a._id ? null : a._id)}><ChevronDown size={18} className={expanded === a._id ? 'rotate-180' : ''} /></button>
                    <button className="text-red-400 hover:text-red-300" onClick={() => handleDelete(a._id)}><Trash2 size={15} /></button>
                  </div>
                </div>
                {expanded === a._id && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {a.signers.map((s) => (
                      <div key={s._id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0"><span className="text-white">{s.name}</span><span className="text-brand-gray-muted"> · {s.role || '—'} · {s.email}</span></div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-900/50 text-green-300' : s.status === 'viewed' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>{t(`admin.agreements.signerStatus.${s.status}`)}</span>
                          {s.status !== 'signed' && s.token && <button className="text-brand-gray-muted hover:text-white flex items-center gap-1 text-xs" onClick={() => copyLink(s.token)}><Link2 size={13} /> {t('admin.agreements.copyLink')}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function apiMsg(e: unknown): string | undefined {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
}
