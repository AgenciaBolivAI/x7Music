'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download, FileText, Check, AlertTriangle } from 'lucide-react';
import { getArtists, type Artist } from '@/api/artistApi';
import {
  getSplitSheets,
  createSplitSheet,
  deleteSplitSheet,
  downloadSplitSheetPdf,
  type SplitSheet,
  type WriterRole,
} from '@/api/splitSheetApi';
import { useLanguage } from '@/context/LanguageContext';

interface RowState {
  artist: string;       // artist _id or ''
  name: string;
  role: WriterRole;
  pro: string;
  ipi: string;
  publisher: string;
  percentage: string;   // kept as string for the input
}

const emptyRow = (): RowState => ({
  artist: '', name: '', role: 'writer', pro: '', ipi: '', publisher: '', percentage: '',
});

const ROLES: WriterRole[] = ['writer', 'composer', 'producer', 'publisher', 'other'];

export default function AdminSplitSheetsPage() {
  const { t } = useLanguage();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [sheets, setSheets] = useState<SplitSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [songTitle, setSongTitle] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<RowState[]>([emptyRow(), emptyRow()]);

  useEffect(() => {
    Promise.all([getArtists(true), getSplitSheets()])
      .then(([a, s]) => { setArtists(a.data.artists); setSheets(s.data.splitSheets); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0),
    [rows]
  );
  const totalRounded = Math.round(total * 100) / 100;
  const totalOk = Math.round(total * 100) === 10000;

  const setRow = (i: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const pickArtist = (i: number, artistId: string) => {
    const a = artists.find((x) => x._id === artistId);
    if (!a) { setRow(i, { artist: '', name: '' }); return; }
    setRow(i, {
      artist: a._id,
      name: a.legalName || a.name,
      pro: a.pro || '',
      ipi: a.ipiNumber || '',
      publisher: a.publisherName || '',
    });
  };

  const canSave = songTitle.trim() !== '' && totalOk &&
    rows.every((r) => r.name.trim() !== '' && r.percentage !== '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await createSplitSheet({
        songTitle: songTitle.trim(),
        workDate: workDate || undefined,
        notes: notes.trim() || undefined,
        writers: rows.map((r) => ({
          artist: r.artist || undefined,
          name: r.name.trim(),
          role: r.role,
          pro: r.pro.trim() || undefined,
          ipi: r.ipi.trim() || undefined,
          publisher: r.publisher.trim() || undefined,
          percentage: parseFloat(r.percentage) || 0,
        })),
      });
      setSheets((prev) => [res.data.splitSheet, ...prev]);
      // download immediately
      await downloadSplitSheetPdf(res.data.splitSheet._id, res.data.splitSheet.songTitle);
      // reset
      setSongTitle(''); setWorkDate(''); setNotes(''); setRows([emptyRow(), emptyRow()]);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('admin.splitSheets.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.splitSheets.confirmDelete'))) return;
    await deleteSplitSheet(id).catch(() => {});
    setSheets((prev) => prev.filter((s) => s._id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-1">{t('admin.splitSheets.title')}</h1>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.splitSheets.subtitle')}</p>

      {/* Composer */}
      <div className="card p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label className="label">{t('admin.splitSheets.songTitle')}</label>
            <input className="input w-full" value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)} placeholder="e.g. Más Que Vencedores" />
          </div>
          <div>
            <label className="label">{t('admin.splitSheets.date')}</label>
            <input type="date" className="input w-full" value={workDate}
              onChange={(e) => setWorkDate(e.target.value)} />
          </div>
        </div>

        {/* Participant rows */}
        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-brand-gray-muted px-1">
            <span className="col-span-3">{t('admin.splitSheets.participant')}</span>
            <span className="col-span-2">{t('admin.splitSheets.role')}</span>
            <span className="col-span-2">PRO</span>
            <span className="col-span-2">IPI/CAE</span>
            <span className="col-span-2">{t('admin.splitSheets.publisher')}</span>
            <span className="col-span-1 text-right">%</span>
          </div>

          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <select className="input w-full text-sm py-2" value={r.artist}
                  onChange={(e) => pickArtist(i, e.target.value)}>
                  <option value="">{t('admin.splitSheets.manualEntry')}</option>
                  {artists.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <input className="input w-full text-sm py-2" placeholder={t('admin.splitSheets.name')}
                  value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              </div>
              <select className="input col-span-6 md:col-span-2 text-sm py-2" value={r.role}
                onChange={(e) => setRow(i, { role: e.target.value as WriterRole })}>
                {ROLES.map((role) => <option key={role} value={role}>{t(`admin.splitSheets.roles.${role}`)}</option>)}
              </select>
              <input className="input col-span-6 md:col-span-2 text-sm py-2" placeholder="PRO"
                value={r.pro} onChange={(e) => setRow(i, { pro: e.target.value })} />
              <input className="input col-span-6 md:col-span-2 text-sm py-2" placeholder="IPI/CAE"
                value={r.ipi} onChange={(e) => setRow(i, { ipi: e.target.value })} />
              <input className="input col-span-6 md:col-span-2 text-sm py-2" placeholder={t('admin.splitSheets.publisher')}
                value={r.publisher} onChange={(e) => setRow(i, { publisher: e.target.value })} />
              <div className="col-span-10 md:col-span-1">
                <input type="number" min="0" max="100" className="input w-full text-sm py-2 text-right"
                  value={r.percentage} onChange={(e) => setRow(i, { percentage: e.target.value })} />
              </div>
              <button
                type="button"
                className="col-span-2 md:col-span-12 text-red-400 hover:text-red-300 text-xs flex items-center justify-end gap-1"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={13} /> {t('admin.splitSheets.removeParticipant')}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button className="btn-outline text-sm flex items-center gap-1.5"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}>
            <Plus size={14} /> {t('admin.splitSheets.addParticipant')}
          </button>
          <div className={`text-sm font-semibold flex items-center gap-2 ${totalOk ? 'text-green-400' : 'text-red-400'}`}>
            {totalOk ? <Check size={15} /> : <AlertTriangle size={15} />}
            {t('admin.splitSheets.total')}: {totalRounded}%
          </div>
        </div>

        <div className="mt-4">
          <label className="label">{t('admin.splitSheets.notes')}</label>
          <textarea className="input w-full resize-none" rows={2} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('admin.splitSheets.notesPlaceholder')} />
        </div>

        {error && (
          <div className="mt-3 text-sm rounded-lg px-4 py-3 bg-red-900/30 text-red-400 flex items-center gap-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary flex items-center gap-2" disabled={!canSave || saving} onClick={handleSave}>
            <FileText size={16} /> {saving ? t('admin.splitSheets.generating') : t('admin.splitSheets.generate')}
          </button>
          {rows.length > 1 && (
            <button className="text-brand-gray-muted hover:text-white text-sm"
              onClick={() => setRows((prev) => prev.slice(0, -1))}>
              {t('admin.splitSheets.removeLast')}
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-heading font-semibold text-white mb-3">{t('admin.splitSheets.history')}</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray-muted">
          <FileText size={34} className="mx-auto mb-3" />
          {t('admin.splitSheets.none')}
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {sheets.map((s) => (
            <div key={s._id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{s.songTitle}</p>
                <p className="text-brand-gray-muted text-xs">
                  {s.writers.length} {t('admin.splitSheets.participants')} · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                  onClick={() => downloadSplitSheetPdf(s._id, s.songTitle)}>
                  <Download size={13} /> PDF
                </button>
                <button className="text-red-400 hover:text-red-300" onClick={() => handleDelete(s._id)}>
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
