'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronRight, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { getClients, getClientDetail, updateClient, type AdminClient } from '@/api/adminApi';
import { type Booking } from '@/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

interface ClientDetailData {
  client: AdminClient;
  bookings: Booking[];
  catalogCount: number;
  docCount: number;
}

export default function AdminClientsPage() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    getClients({ search: search || undefined, page, limit })
      .then((res) => {
        setClients(res.data.clients);
        setTotal(res.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleViewDetail = (id: string) => {
    setDetailLoading(true);
    getClientDetail(id)
      .then((res) => setDetail(res.data as ClientDetailData))
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  };

  const handleToggleActive = async (client: AdminClient) => {
    const updated = await updateClient(client._id, { isActive: !client.isActive });
    setClients((prev) =>
      prev.map((c) => (c._id === client._id ? { ...c, isActive: updated.data.client.isActive } : c))
    );
    if (detail?.client._id === client._id) {
      setDetail((prev) => prev ? { ...prev, client: updated.data.client } : prev);
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-6">{t('admin.clients.title')}</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-muted" />
        <input
          className="input pl-9 w-full max-w-sm"
          placeholder={t('admin.clients.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Client list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="card p-12 text-center text-brand-gray-muted">{t('admin.clients.noClients')}</div>
          ) : (
            <>
              <div className="card overflow-hidden divide-y divide-white/5">
                {clients.map((client) => (
                  <div
                    key={client._id}
                    className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(client._id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red font-bold text-sm shrink-0">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {client.firstName} {client.lastName}
                        {!client.isActive && (
                          <span className="ml-2 text-xs text-brand-gray-muted">{t('admin.clients.inactive')}</span>
                        )}
                      </p>
                      <p className="text-brand-gray-muted text-sm truncate">{client.email}</p>
                      {client.company && (
                        <p className="text-brand-gray-muted text-xs truncate">{client.company}</p>
                      )}
                    </div>
                    <div className="text-brand-gray-muted text-xs shrink-0">{formatDate(client.createdAt)}</div>
                    <ChevronRight size={16} className="text-brand-gray-muted shrink-0" />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-outline text-sm px-4 py-2 disabled:opacity-40"
                  >
                    {t('common.prev')}
                  </button>
                  <span className="text-brand-gray-muted flex items-center text-sm">
                    {page} / {pages}
                  </span>
                  <button
                    disabled={page === pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-outline text-sm px-4 py-2 disabled:opacity-40"
                  >
                    {t('common.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {(detail || detailLoading) && (
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="card p-5 lg:sticky lg:top-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detail ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading font-semibold text-white text-lg">
                      {detail.client.firstName} {detail.client.lastName}
                    </h2>
                    <button onClick={() => setDetail(null)} className="text-brand-gray-muted hover:text-white">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <p className="text-brand-gray-muted">{detail.client.email}</p>
                    {detail.client.phone && <p className="text-brand-gray-muted">{detail.client.phone}</p>}
                    {detail.client.company && (
                      <p className="text-white">{detail.client.company}</p>
                    )}
                    <p className="text-brand-gray-muted">{t('admin.clients.joined')} {formatDate(detail.client.createdAt)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-brand-black/40 rounded-lg p-2 text-center">
                      <p className="text-white font-bold">{detail.bookings.length}</p>
                      <p className="text-brand-gray-muted text-xs">{t('admin.clients.bookings')}</p>
                    </div>
                    <div className="bg-brand-black/40 rounded-lg p-2 text-center">
                      <p className="text-white font-bold">{detail.catalogCount}</p>
                      <p className="text-brand-gray-muted text-xs">{t('admin.clients.catalog')}</p>
                    </div>
                    <div className="bg-brand-black/40 rounded-lg p-2 text-center">
                      <p className="text-white font-bold">{detail.docCount}</p>
                      <p className="text-brand-gray-muted text-xs">{t('admin.clients.documents')}</p>
                    </div>
                  </div>

                  {/* Recent bookings */}
                  {detail.bookings.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-brand-gray-muted uppercase tracking-wide mb-2">{t('admin.clients.recentBookings')}</p>
                      <div className="space-y-2">
                        {detail.bookings.slice(0, 5).map((b) => {
                          const svc = b.service as unknown as { title: string };
                          return (
                            <div key={b._id} className="flex items-center justify-between text-xs">
                              <span className="text-white truncate">{svc?.title}</span>
                              <span className={`badge badge-${b.status} ml-2 shrink-0`}>{b.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(detail.client)}
                    className="flex items-center gap-2 text-sm w-full mt-2"
                  >
                    {detail.client.isActive ? (
                      <>
                        <ToggleRight size={20} className="text-green-400" />
                        <span className="text-green-400">{t('admin.clients.deactivate')}</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={20} className="text-brand-gray-muted" />
                        <span className="text-brand-gray-muted">{t('admin.clients.activate')}</span>
                      </>
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
