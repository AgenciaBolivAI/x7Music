'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Download } from 'lucide-react';
import { getMyDocuments, downloadDocument, type Document } from '@/api/documentApi';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MyDocumentsPage() {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyDocuments()
      .then((res) => setDocuments(res.data.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-2">{t('portal.documents.title')}</h1>
      <p className="text-brand-gray-muted mb-8">
        {t('portal.documents.subtitle')}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={40} className="text-brand-gray-muted mx-auto mb-4" />
          <p className="text-brand-gray-muted">{t('portal.documents.noDocuments')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-white/5">
          {documents.map((doc) => (
            <div key={doc._id} className="px-5 py-4 flex items-center gap-4">
              <FolderOpen size={20} className="text-brand-gray-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{doc.title}</p>
                <p className="text-brand-gray-muted text-sm capitalize">
                  {doc.type}
                  {doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ''}
                  {' · '}
                  {formatDate(doc.createdAt)}
                </p>
              </div>
              <button
                onClick={() => downloadDocument(doc._id, doc.title).catch(() => alert('Download failed.'))}
                className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
              >
                <Download size={14} /> {t('portal.documents.download')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
