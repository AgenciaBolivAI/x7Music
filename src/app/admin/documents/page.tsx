'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Download, Trash2, FolderOpen, Search } from 'lucide-react';
import { getAllDocuments, uploadDocument, deleteDocument, downloadDocument, type Document } from '@/api/documentApi';
import { getClients, type AdminClient } from '@/api/adminApi';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DOC_TYPES = ['invoice', 'contract', 'report', 'receipt', 'other'] as const;

export default function AdminDocumentsPage() {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    clientId: '',
    title: '',
    type: 'other' as typeof DOC_TYPES[number],
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const load = () => {
    setLoading(true);
    getAllDocuments()
      .then((res) => setDocuments(res.data.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getClients({ limit: 200 })
      .then((res) => setClients(res.data.clients))
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadForm.clientId || !uploadForm.title) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('clientId', uploadForm.clientId);
      fd.append('title', uploadForm.title);
      fd.append('type', uploadForm.type);
      const res = await uploadDocument(fd);
      setDocuments((prev) => [res.data.document, ...prev]);
      setShowUpload(false);
      setUploadFile(null);
      setUploadForm({ clientId: '', title: '', type: 'other' });
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await deleteDocument(id).catch(() => {});
    setDocuments((prev) => prev.filter((d) => d._id !== id));
  };

  const filtered = documents.filter((doc) => {
    const client = doc.client as AdminClient;
    const name = typeof client === 'object'
      ? `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase()
      : '';
    return (
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      name.includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.documents.title')}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowUpload(true)}>
          <Upload size={18} /> {t('admin.documents.uploadDocument')}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="card p-6 mb-6">
          <h2 className="font-heading font-semibold text-white mb-4">{t('admin.documents.uploadToClient')}</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.documents.client')} *</label>
                <select className="input w-full" required value={uploadForm.clientId}
                  onChange={(e) => setUploadForm((p) => ({ ...p, clientId: e.target.value }))}>
                  <option value="">{t('admin.documents.selectClient')}</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('admin.documents.documentType')}</label>
                <select className="input w-full" value={uploadForm.type}
                  onChange={(e) => setUploadForm((p) => ({ ...p, type: e.target.value as typeof DOC_TYPES[number] }))}>
                  {DOC_TYPES.map((dt) => (
                    <option key={dt} value={dt} className="capitalize">{dt}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('admin.documents.docTitle')} *</label>
                <input className="input w-full" required placeholder={t('admin.documents.titlePlaceholder')}
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
            </div>

            {/* File picker */}
            <div>
              <label className="label">{t('admin.documents.file')} *</label>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {uploadFile ? (
                  <p className="text-white text-sm">{uploadFile.name} ({formatSize(uploadFile.size)})</p>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-brand-gray-muted">
                    <FolderOpen size={28} />
                    <p className="text-sm">{t('admin.documents.clickToSelect')}</p>
                    <p className="text-xs">{t('admin.documents.maxSize')}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={uploading || !uploadFile}>
                {uploading ? t('admin.documents.uploading') : t('common.upload')}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowUpload(false)}>
                {t('admin.documents.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-muted" />
        <input className="input pl-9 w-full max-w-sm" placeholder="Search by title or client…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Documents table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">{t('admin.documents.noDocuments')}</div>
      ) : (
        <div className="card overflow-hidden divide-y divide-white/5">
          {filtered.map((doc) => {
            const client = doc.client as AdminClient;
            return (
              <div key={doc._id} className="px-5 py-4 flex items-center gap-4">
                <FolderOpen size={20} className="text-brand-gray-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{doc.title}</p>
                  <p className="text-brand-gray-muted text-sm">
                    {typeof client === 'object' ? `${client.firstName} ${client.lastName}` : 'Unknown'} · {' '}
                    <span className="capitalize">{doc.type}</span>
                    {doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ''}
                  </p>
                </div>
                <span className="text-brand-gray-muted text-xs shrink-0">{formatDate(doc.createdAt)}</span>
                <button
                  onClick={() => downloadDocument(doc._id, doc.title).catch(() => alert('Download failed.'))}
                  className="text-brand-gray-muted hover:text-white shrink-0"
                  title={t('common.download')}
                >
                  <Download size={16} />
                </button>
                <button
                  className="text-red-400 hover:text-red-300 shrink-0"
                  onClick={() => handleDelete(doc._id)}
                  title={t('common.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
