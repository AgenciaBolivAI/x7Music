'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Music2, FolderOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyBookings, type Booking } from '@/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  };
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
};

export default function PortalDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(res.data.bookings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter(
    (b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduledAt) > new Date()
  ).slice(0, 3);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-heading font-bold text-white mb-1">
        {t('portal.dashboard.welcome')}, {user?.firstName}!
      </h1>
      <p className="text-brand-gray-muted mb-8">{t('portal.dashboard.quickActions')}</p>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link href="/portal/bookings" className="card p-5 flex items-center gap-4 hover:border-brand-red/40 border border-transparent transition-colors">
          <div className="p-3 bg-brand-red/10 rounded-xl text-brand-red">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-white font-medium">{t('portal.dashboard.myBookings')}</p>
            <p className="text-brand-gray-muted text-sm">{t('portal.dashboard.upcomingSessionsLabel')}</p>
          </div>
        </Link>
        <Link href="/portal/catalog" className="card p-5 flex items-center gap-4 hover:border-brand-red/40 border border-transparent transition-colors">
          <div className="p-3 bg-brand-red/10 rounded-xl text-brand-red">
            <Music2 size={22} />
          </div>
          <div>
            <p className="text-white font-medium">{t('portal.dashboard.myCatalog')}</p>
            <p className="text-brand-gray-muted text-sm">{t('portal.dashboard.registeredWorks')}</p>
          </div>
        </Link>
        <Link href="/portal/documents" className="card p-5 flex items-center gap-4 hover:border-brand-red/40 border border-transparent transition-colors">
          <div className="p-3 bg-brand-red/10 rounded-xl text-brand-red">
            <FolderOpen size={22} />
          </div>
          <div>
            <p className="text-white font-medium">{t('portal.dashboard.documents')}</p>
            <p className="text-brand-gray-muted text-sm">{t('portal.dashboard.contractsReports')}</p>
          </div>
        </Link>
      </div>

      {/* Upcoming bookings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-heading font-semibold text-white">{t('portal.dashboard.upcomingSessions')}</h2>
          <Link href="/portal/bookings" className="text-brand-red text-sm hover:underline flex items-center gap-1">
            {t('portal.dashboard.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-brand-gray-muted mb-4">{t('portal.dashboard.noSessions')}</p>
            <Link href="/book" className="btn-primary text-sm">{t('portal.dashboard.bookSession')}</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {upcoming.map((b) => {
              const svc = b.service as unknown as { title: string; duration: number };
              return (
                <div key={b._id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">{svc?.title}</p>
                    <p className="text-brand-gray-muted text-sm">{formatDate(b.scheduledAt)}</p>
                  </div>
                  {statusBadge(b.status)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book CTA */}
      <div className="mt-8 card p-6 text-center">
        <p className="text-white font-medium mb-3">{t('portal.dashboard.readyToBook')}</p>
        <Link href="/book" className="btn-primary">{t('portal.dashboard.bookSession')}</Link>
      </div>
    </div>
  );
}
