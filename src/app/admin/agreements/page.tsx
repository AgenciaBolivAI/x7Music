'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Download, Send, FileText, Check, AlertTriangle, Link2, ChevronDown, PenLine,
} from 'lucide-react';
import { getArtists, type Artist } from '@/api/artistApi';
import {
  getAgreements, createAgreement, deleteAgreement, sendAgreement, downloadAgreementPdf,
  type Agreement, type AgreementType, type SignerInput,
} from '@/api/agreementApi';
import ArtistPicker from '@/components/admin/ArtistPicker';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface Part {
  artistId?: string;
  name: string; email: string; role: string;
  pro: string; ipi: string; publisher: string; publisherIpi: string; percentage: string;
}
const emptyPart = (): Part => ({ name: '', email: '', role: 'Compositor', pro: '', ipi: '', publisher: '', publisherIpi: '', percentage: '' });

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  sent: 'bg-blue-900/50 text-blue-300',
  partially_signed: 'bg-yellow-900/50 text-yellow-300',
  completed: 'bg-green-900/50 text-green-300',
  voided: 'bg-red-900/50 text-red-300',
};

export default function AdminAgreementsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [list, setList] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [mode, setMode] = useState<AgreementType>('split_sheet');

  // Split-sheet state
  const [song, setSong] = useState({ songTitle: '', artists: '', producer: '', effectiveDate: '', recordingVersion: 'Grabación original', isrc: '', iswc: '', notes: '' });
  const [parts, setParts] = useState<Part[]>([emptyPart(), emptyPart()]);

  // Distribution state
  const [dist, setDist] = useState({ artistId: '', artistName: '', legalName: '', address: '', email: '', phone: '', releaseTitle: '', catalogScope: '', territory: 'Mundial (Worldwide)', term: '', distributionFeePct: '15', effectiveDate: '', notes: '' });
  const [labelSigner, setLabelSigner] = useState({ name: 'Steven Pantojas', email: '' });

  useEffect(() => {
    Promise.all([getArtists(true), getAgreements()])
      .then(([a, g]) => { setArtists(a.data.artists); setList(g.data.agreements); })
      .catch(() => toast.error(t('admin.agreements.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { if (user?.email && !labelSigner.email) setLabelSigner((s) => ({ ...s, email: user.email })); }, [user, labelSigner.email]);

  const total = useMemo(() => parts.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0), [parts]);
  const totalOk = Math.round(total * 100) === 10000;

  const setPart = (i: number, patch: Partial<Part>) =>
    setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const fillPartFromArtist = (i: number, a: Artist) =>
    setPart(i, {
      artistId: a._id,
      name: a.legalName || a.name,
      email: a.contactEmail || '',
      pro: a.pro || '',
      ipi: a.ipiNumber || '',
      publisher: a.publisherName || '',
      publisherIpi: a.publisherIpi || '',
    });

  const fillDistFromArtist = (a: Artist) =>
    setDist((d) => ({
      ...d,
      artistId: a._id,
      artistName: a.stageName || a.name,
      legalName: a.legalName || '',
      address: a.address || '',
      email: a.contactEmail || '',
      phone: a.phone || '',
    }));

  const refresh = () => getAgreements().then((g) => setList(g.data.agreements)).catch(() => {});

  const saveSplit = async () => {
    if (!song.songTitle.trim()) return toast.error(t('admin.agreements.needTitle'));
    if (!totalOk) return toast.error(t('admin.agreements.need100'));
    if (!parts.every((p) => p.name.trim() && p.email.trim())) return toast.error(t('admin.agreements.needNameEmail'));
    setSaving(true);
    try {
      const data = {
        songTitle: song.songTitle.trim(), artists: song.artists.trim(), producer: song.producer.trim(),
        effectiveDate: song.effectiveDate || undefined, recordingVersion: song.recordingVersion.trim(),
        isrc: song.isrc.trim(), iswc: song.iswc.trim(), notes: song.notes.trim() || undefined,
        writers: parts.map((p) => ({ name: p.name.trim(), role: p.role, pro: p.pro, ipi: p.ipi, publisher: p.publisher, publisherIpi: p.publisherIpi, percentage: parseFloat(p.percentage) || 0 })),
      };
      const signers: SignerInput[] = parts.map((p) => ({ artistId: p.artistId, name: p.name.trim(), email: p.email.trim(), role: p.role || 'Compositor' }));
      await createAgreement({ type: 'split_sheet', title: song.songTitle.trim(), data, signers });
      toast.success(t('admin.agreements.created'));
      setSong({ songTitle: '', artists: '', producer: '', effectiveDate: '', recordingVersion: 'Grabación original', isrc: '', iswc: '', notes: '' });
      setParts([emptyPart(), emptyPart()]);
      refresh();
    } catch (e) { toast.error(apiMsg(e) || t('admin.agreements.saveError')); }
    finally { setSaving(false); }
  };

  const saveDistribution = async () => {
    if (!dist.artistName.trim() || !dist.email.trim()) return toast.error(t('admin.agreements.needArtistEmail'));
    setSaving(true);
    try {
      const title = `Acuerdo de Distribución — ${dist.artistName.trim()}`;
      const data = {
        artistName: dist.artistName.trim(), legalName: dist.legalName.trim(), address: dist.address.trim(),
        email: dist.email.trim(), phone: dist.phone.trim(), releaseTitle: dist.releaseTitle.trim(),
        catalogScope: dist.catalogScope.trim(), territory: dist.territory.trim(), term: dist.term.trim(),
        distributionFeePct: parseFloat(dist.distributionFeePct) || 0, effectiveDate: dist.effectiveDate || undefined,
        notes: dist.notes.trim() || undefined,
      };
      const signers: SignerInput[] = [{ artistId: dist.artistId || undefined, name: dist.legalName.trim() || dist.artistName.trim(), email: dist.email.trim(), role: 'Titular' }];
      if (labelSigner.email.trim()) signers.push({ name: labelSigner.name.trim() || 'X7 Music Group', email: labelSigner.email.trim(), role: 'Distribuidor (X7)' });
      await createAgreement({ type: 'distribution_agreement', title, data, signers });
      toast.success(t('admin.agreements.created'));
      setDist({ artistId: '', artistName: '', legalName: '', address: '', email: '', phone: '', releaseTitle: '', catalogScope: '', territory: 'Mundial (Worldwide)', term: '', distributionFeePct: '15', effectiveDate: '', notes: '' });
      refresh();
    } catch (e) { toast.error(apiMsg(e) || t('admin.agreements.saveError')); }
    finally { setSaving(false); }
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

  const TYPE_LABEL: Record<AgreementType, string> = {
    split_sheet: t('admin.agreements.type.split_sheet'),
    distribution_agreement: t('admin.agreements.type.distribution_agreement'),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2">
        <PenLine size={26} /> {t('admin.agreements.title')}
      </h1>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.agreements.subtitle')}</p>

      {/* Type selector */}
      <div className="flex gap-2 mb-5">
        {(['split_sheet', 'distribution_agreement'] as AgreementType[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === m ? 'bg-brand-red text-white' : 'bg-brand-gray text-brand-gray-muted hover:text-white'}`}>
            {TYPE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Builder */}
      <div className="card p-6 mb-8">
        {mode === 'split_sheet' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label={t('admin.agreements.songTitle')} value={song.songTitle} onChange={(v) => setSong({ ...song, songTitle: v })} placeholder="VENGA TU REINO" />
              <Field label={t('admin.agreements.artistsField')} value={song.artists} onChange={(v) => setSong({ ...song, artists: v })} placeholder="Jesús M. García Feat. Práctiko" />
              <Field label={t('admin.agreements.producer')} value={song.producer} onChange={(v) => setSong({ ...song, producer: v })} placeholder="Steven Pantojas" />
              <Field label={t('admin.agreements.effectiveDate')} type="date" value={song.effectiveDate} onChange={(v) => setSong({ ...song, effectiveDate: v })} />
              <Field label={t('admin.agreements.recordingVersion')} value={song.recordingVersion} onChange={(v) => setSong({ ...song, recordingVersion: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="ISRC" value={song.isrc} onChange={(v) => setSong({ ...song, isrc: v })} placeholder="USL4Q2055167" />
                <Field label="ISWC" value={song.iswc} onChange={(v) => setSong({ ...song, iswc: v })} placeholder="T9280978827" />
              </div>
            </div>

            <p className="label mb-2">{t('admin.agreements.participants')}</p>
            <div className="space-y-4">
              {parts.map((p, i) => (
                <div key={i} className="rounded-lg border border-white/10 p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-1">
                      <ArtistPicker artists={artists} onPick={(a) => fillPartFromArtist(i, a)} placeholder={t('admin.agreements.pickArtist')} initial={p.name} />
                    </div>
                    <input className="input text-sm md:col-span-1" placeholder={t('admin.agreements.signerName')} value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} />
                    <input className="input text-sm md:col-span-1" placeholder="email@..." value={p.email} onChange={(e) => setPart(i, { email: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <input className="input text-sm" placeholder={t('admin.agreements.role')} value={p.role} onChange={(e) => setPart(i, { role: e.target.value })} />
                    <input className="input text-sm" placeholder="PRO" value={p.pro} onChange={(e) => setPart(i, { pro: e.target.value })} />
                    <input className="input text-sm" placeholder="IPI" value={p.ipi} onChange={(e) => setPart(i, { ipi: e.target.value })} />
                    <input className="input text-sm" placeholder={t('admin.agreements.publisher')} value={p.publisher} onChange={(e) => setPart(i, { publisher: e.target.value })} />
                    <input className="input text-sm" placeholder="Pub. IPI" value={p.publisherIpi} onChange={(e) => setPart(i, { publisherIpi: e.target.value })} />
                    <input className="input text-sm text-right" type="number" min="0" max="100" placeholder="%" value={p.percentage} onChange={(e) => setPart(i, { percentage: e.target.value })} />
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
              <button className="btn-outline text-sm flex items-center gap-1.5" onClick={() => setParts((p) => [...p, emptyPart()])}>
                <Plus size={14} /> {t('admin.agreements.addParticipant')}
              </button>
              <div className={`text-sm font-semibold flex items-center gap-1.5 ${totalOk ? 'text-green-400' : 'text-red-400'}`}>
                {totalOk ? <Check size={15} /> : <AlertTriangle size={15} />} {t('admin.agreements.total')}: {Math.round(total * 100) / 100}%
              </div>
            </div>

            <Field className="mt-4" label={t('admin.agreements.notes')} value={song.notes} onChange={(v) => setSong({ ...song, notes: v })} textarea />

            <button className="btn-primary flex items-center gap-2 mt-5" disabled={saving} onClick={saveSplit}>
              <FileText size={16} /> {saving ? t('admin.agreements.saving') : t('admin.agreements.create')}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="label">{t('admin.agreements.pickArtist')}</label>
              <ArtistPicker artists={artists} onPick={fillDistFromArtist} placeholder={t('admin.agreements.pickArtist')} initial={dist.artistName} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('admin.agreements.artistName')} value={dist.artistName} onChange={(v) => setDist({ ...dist, artistName: v })} />
              <Field label={t('admin.agreements.legalName')} value={dist.legalName} onChange={(v) => setDist({ ...dist, legalName: v })} />
              <Field label="Email" value={dist.email} onChange={(v) => setDist({ ...dist, email: v })} placeholder="email@..." />
              <Field label={t('admin.agreements.phone')} value={dist.phone} onChange={(v) => setDist({ ...dist, phone: v })} />
              <Field className="sm:col-span-2" label={t('admin.agreements.address')} value={dist.address} onChange={(v) => setDist({ ...dist, address: v })} />
              <Field label={t('admin.agreements.releaseTitle')} value={dist.releaseTitle} onChange={(v) => setDist({ ...dist, releaseTitle: v })} />
              <Field label={t('admin.agreements.catalogScope')} value={dist.catalogScope} onChange={(v) => setDist({ ...dist, catalogScope: v })} placeholder="Catálogo completo / sencillo…" />
              <Field label={t('admin.agreements.territory')} value={dist.territory} onChange={(v) => setDist({ ...dist, territory: v })} />
              <Field label={t('admin.agreements.term')} value={dist.term} onChange={(v) => setDist({ ...dist, term: v })} placeholder="2 años renovables" />
              <Field label={t('admin.agreements.feePct')} type="number" value={dist.distributionFeePct} onChange={(v) => setDist({ ...dist, distributionFeePct: v })} />
              <Field label={t('admin.agreements.effectiveDate')} type="date" value={dist.effectiveDate} onChange={(v) => setDist({ ...dist, effectiveDate: v })} />
            </div>
            <Field className="mt-4" label={t('admin.agreements.notes')} value={dist.notes} onChange={(v) => setDist({ ...dist, notes: v })} textarea />

            <div className="mt-4 rounded-lg border border-white/10 p-3">
              <p className="label mb-2">{t('admin.agreements.labelSigner')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className="input text-sm" value={labelSigner.name} onChange={(e) => setLabelSigner({ ...labelSigner, name: e.target.value })} placeholder={t('admin.agreements.signerName')} />
                <input className="input text-sm" value={labelSigner.email} onChange={(e) => setLabelSigner({ ...labelSigner, email: e.target.value })} placeholder="email@..." />
              </div>
            </div>

            <button className="btn-primary flex items-center gap-2 mt-5" disabled={saving} onClick={saveDistribution}>
              <FileText size={16} /> {saving ? t('admin.agreements.saving') : t('admin.agreements.create')}
            </button>
          </>
        )}
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
                    <p className="text-brand-gray-muted text-xs mt-0.5">
                      {TYPE_LABEL[a.type]} · {signed}/{a.signers.length} {t('admin.agreements.signed')} · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => downloadAgreementPdf(a._id, a.title)}>
                      <Download size={13} /> PDF
                    </button>
                    {a.status !== 'completed' && (
                      <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => handleSend(a)}>
                        <Send size={13} /> {t('admin.agreements.send')}
                      </button>
                    )}
                    <button className="text-brand-gray-muted hover:text-white" onClick={() => setExpanded(expanded === a._id ? null : a._id)}>
                      <ChevronDown size={18} className={expanded === a._id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    <button className="text-red-400 hover:text-red-300" onClick={() => handleDelete(a._id)}><Trash2 size={15} /></button>
                  </div>
                </div>
                {expanded === a._id && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {a.signers.map((s) => (
                      <div key={s._id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <span className="text-white">{s.name}</span>
                          <span className="text-brand-gray-muted"> · {s.role || '—'} · {s.email}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-900/50 text-green-300' : s.status === 'viewed' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>
                            {t(`admin.agreements.signerStatus.${s.status}`)}
                          </span>
                          {s.status !== 'signed' && s.token && (
                            <button className="text-brand-gray-muted hover:text-white flex items-center gap-1 text-xs" onClick={() => copyLink(s.token)}>
                              <Link2 size={13} /> {t('admin.agreements.copyLink')}
                            </button>
                          )}
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

function Field({ label, value, onChange, placeholder, type = 'text', textarea, className }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea className="input w-full text-sm resize-none" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className="input w-full text-sm" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function apiMsg(e: unknown): string | undefined {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
}
