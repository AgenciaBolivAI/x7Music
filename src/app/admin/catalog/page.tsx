'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Search, CheckCircle } from 'lucide-react';
import { getAllCatalog, updateEntry, deleteEntry, type CatalogEntry } from '@/api/catalogApi';
import { getClients, type AdminClient } from '@/api/adminApi';
import { useLanguage } from '@/context/LanguageContext';

const STATUS_OPTIONS = ['pending', 'in_progress', 'registered', 'issue'] as const;

const statusBadge = (status: CatalogEntry['status']) => {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    in_progress: 'badge-in_progress',
    registered: 'badge-registered',
    issue: 'badge-issue',
  };
  return <span className={`badge ${map[status] ?? 'badge-pending'}`}>{status.replace('_', ' ')}</span>;
};

export default function AdminCatalogPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState<CatalogEntry['status']>('pending');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllCatalog()
      .then((res) => setEntries(res.data.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getClients({ limit: 200 })
      .then((res) => setClients(res.data.clients))
      .catch(() => {});
  }, []);

  const openEdit = (entry: CatalogEntry) => {
    setEditing(entry);
    setNewStatus(entry.status);
    setStatusNote(entry.statusNotes ?? '');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await updateEntry(editing._id, {
        status: newStatus,
        statusNotes: statusNote,
      });
      setEntries((prev) =>
        prev.map((e) => (e._id === editing._id ? res.data.entry : e))
      );
      setEditing(null);
    } catch {
      alert('Failed to update entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this catalog entry?')) return;
    await deleteEntry(id).catch(() => {});
    setEntries((prev) => prev.filter((e) => e._id !== id));
  };

  const getClientName = (client: CatalogEntry['client']) => {
    if (typeof client === 'object') return `${client.firstName} ${client.lastName}`;
    const found = clients.find((c) => c._id === client);
    return found ? `${found.firstName} ${found.lastName}` : 'Unknown';
  };

  const filtered = entries.filter((e) => {
    const name = getClientName(e.client).toLowerCase();
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || name.includes(q);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-6">{t('admin.catalog.title')}</h1>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-heading font-semibold text-white text-lg mb-1">{editing.title}</h2>
            <p className="text-brand-gray-muted text-sm mb-4">{getClientName(editing.client)}</p>

            <div className="space-y-4">
              <div>
                <label className="label">{t('admin.catalog.status')}</label>
                <select className="input w-full" value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CatalogEntry['status'])}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('admin.catalog.notes')}</label>
                <textarea className="input w-full resize-none" rows={3} value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={t('admin.catalog.notesPlaceholder')} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
                <CheckCircle size={16} /> {saving ? t('admin.bookings.saving') : t('admin.catalog.save')}
              </button>
              <button className="btn-outline" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-muted" />
        <input className="input pl-9 w-full max-w-sm" placeholder={t('admin.catalog.searchPlaceholder')}
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">
          {t('admin.catalog.noCatalog')}
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-white/5">
          {filtered.map((entry) => (
            <div key={entry._id} className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{entry.title}</p>
                  <span className="text-brand-gray-muted text-xs capitalize">{entry.type}</span>
                  {statusBadge(entry.status)}
                </div>
                <p className="text-brand-gray-muted text-sm mt-0.5">{getClientName(entry.client)}</p>
                {entry.statusNotes && (
                  <p className="text-brand-gray-muted text-xs mt-0.5 line-clamp-1">{entry.statusNotes}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                  onClick={() => openEdit(entry)}
                >
                  <Pencil size={12} /> {t('admin.catalog.updateStatus')}
                </button>
                <button
                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-2"
                  onClick={() => handleDelete(entry._id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
