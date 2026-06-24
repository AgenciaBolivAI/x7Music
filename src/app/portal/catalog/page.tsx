'use client';

import { useEffect, useState } from 'react';
import { Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { getMyCatalog, type CatalogEntry } from '@/api/catalogApi';
import { useLanguage } from '@/context/LanguageContext';

const statusBadge = (status: CatalogEntry['status']) => {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    in_progress: 'badge-in_progress',
    registered: 'badge-registered',
    issue: 'badge-issue',
  };
  return <span className={`badge ${map[status] ?? 'badge-pending'}`}>{status.replace('_', ' ')}</span>;
};

export default function MyCatalogPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getMyCatalog()
      .then((res) => setEntries(res.data.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-2">{t('portal.catalog.title')}</h1>
      <p className="text-brand-gray-muted mb-8">
        {t('portal.catalog.subtitle')}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <Music2 size={40} className="text-brand-gray-muted mx-auto mb-4" />
          <p className="text-brand-gray-muted">{t('portal.catalog.noEntries')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry._id} className="card overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4"
                onClick={() => setExpanded(expanded === entry._id ? null : entry._id)}
              >
                <Music2 size={18} className="text-brand-gray-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium">{entry.title}</p>
                    <span className="text-brand-gray-muted text-xs capitalize">{entry.type}</span>
                    {statusBadge(entry.status)}
                  </div>
                  {entry.releaseDate && (
                    <p className="text-brand-gray-muted text-xs mt-0.5">
                      {new Date(entry.releaseDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-brand-gray-muted shrink-0">
                  {expanded === entry._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expanded === entry._id && (
                <div className="border-t border-white/10 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {entry.isrc && (
                    <div>
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.isrc')}</p>
                      <p className="text-white font-mono">{entry.isrc}</p>
                    </div>
                  )}
                  {entry.iswc && (
                    <div>
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.iswc')}</p>
                      <p className="text-white font-mono">{entry.iswc}</p>
                    </div>
                  )}
                  {entry.upc && (
                    <div>
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.upc')}</p>
                      <p className="text-white font-mono">{entry.upc}</p>
                    </div>
                  )}
                  {entry.registeredPRO && (
                    <div>
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.pro')}</p>
                      <p className="text-white">{entry.registeredPRO}</p>
                    </div>
                  )}
                  {entry.distributionPlatforms && entry.distributionPlatforms.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.distribution')}</p>
                      <p className="text-white">{entry.distributionPlatforms.join(', ')}</p>
                    </div>
                  )}
                  {entry.statusNotes && (
                    <div className="col-span-full">
                      <p className="text-brand-gray-muted text-xs mb-0.5">{t('portal.catalog.statusNotes')}</p>
                      <p className="text-white">{entry.statusNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
