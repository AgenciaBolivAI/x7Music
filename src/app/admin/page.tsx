'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Users, CalendarDays, DollarSign, Inbox, Calendar, Clock, Mail, Music, Disc3,
  BookOpen, FileSignature, TrendingUp, TrendingDown, RefreshCw, Activity, UserPlus,
} from 'lucide-react';
import { getDashboardStats, type DashboardResponse } from '@/api/adminApi';
import { TrendChart, Donut } from '@/components/admin/charts';
import { useLanguage } from '@/context/LanguageContext';

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const fmtMoneyExact = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

function Trend({ change }: { change: number | null }) {
  if (change === null) return null;
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(change)}%
    </span>
  );
}

interface KpiProps { label: string; value: string | number; icon: React.ReactNode; change?: number | null; sub?: string; to?: string; highlight?: boolean }
function Kpi({ label, value, icon, change, sub, to, highlight }: KpiProps) {
  const inner = (
    <div className={`card p-5 h-full ${highlight ? 'border border-brand-red/40' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 bg-brand-red/10 rounded-xl text-brand-red">{icon}</div>
        {change !== undefined && <Trend change={change} />}
      </div>
      <p className="text-2xl font-heading font-bold text-white leading-none">{value}</p>
      <p className="text-brand-gray-muted text-sm mt-1.5">{label}</p>
      {sub && <p className="text-brand-gray-muted/70 text-xs mt-0.5">{sub}</p>}
    </div>
  );
  return to ? <Link href={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await getDashboardStats();
      setData(res.data);
      setUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => load(true), 60_000); // live refresh
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = data?.stats;
  const series = data?.series;
  const bs = data?.breakdown.bookingStatus ?? {};

  const bookingSegments = [
    { label: t('admin.dashboard.status.pending'), value: bs.pending ?? 0, color: '#EAB308' },
    { label: t('admin.dashboard.status.confirmed'), value: bs.confirmed ?? 0, color: '#3B82F6' },
    { label: t('admin.dashboard.status.completed'), value: bs.completed ?? 0, color: '#22C55E' },
    { label: t('admin.dashboard.status.cancelled'), value: bs.cancelled ?? 0, color: '#EF4444' },
  ];

  const contentStats = [
    { label: t('admin.dashboard.artists'), value: s?.publishedArtists ?? 0, icon: <Music size={16} />, to: '/admin/artists' },
    { label: t('admin.dashboard.releases'), value: s?.publishedReleases ?? 0, icon: <Disc3 size={16} />, to: '/admin/releases' },
    { label: t('admin.dashboard.posts'), value: s?.blogPosts ?? 0, icon: <BookOpen size={16} />, to: '/admin/blog' },
    { label: t('admin.dashboard.catalog'), value: s?.catalogEntries ?? 0, icon: <Music size={16} />, to: '/admin/catalog' },
    { label: t('admin.dashboard.agreementsPending'), value: s?.agreementsPending ?? 0, icon: <FileSignature size={16} />, to: '/admin/agreements' },
    { label: t('admin.dashboard.upcomingEvents'), value: s?.upcomingEventsCount ?? 0, icon: <Calendar size={16} />, to: '/admin/events' },
  ];

  const recentBookings = (data?.recentBookings ?? []) as {
    _id: string; scheduledAt: string; status: string;
    client?: { firstName?: string; lastName?: string; email?: string };
    service?: { title?: string };
  }[];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">{t('admin.dashboard.title')}</h1>
          <p className="text-brand-gray-muted">{t('admin.dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-brand-gray-muted text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {updatedAt ? `${t('admin.dashboard.updated')} ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <button onClick={() => load(true)} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5" disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {t('admin.dashboard.refresh')}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label={t('admin.dashboard.revenueThisMonth')} value={fmtMoney(s?.revenueThisMonth ?? 0)}
          icon={<DollarSign size={20} />} change={pctChange(s?.revenueThisMonth ?? 0, s?.revenueLastMonth ?? 0)}
          sub={`${t('admin.dashboard.allTime')}: ${fmtMoney(s?.revenueAllTime ?? 0)}`} highlight />
        <Kpi label={t('admin.dashboard.bookingsThisMonth')} value={s?.bookingsThisMonth ?? 0}
          icon={<CalendarDays size={20} />} change={pctChange(s?.bookingsThisMonth ?? 0, s?.bookingsLastMonth ?? 0)} to="/admin/bookings" />
        <Kpi label={t('admin.dashboard.newClients')} value={s?.newClientsThisMonth ?? 0}
          icon={<UserPlus size={20} />} change={pctChange(s?.newClientsThisMonth ?? 0, s?.newClientsLastMonth ?? 0)}
          sub={`${t('admin.dashboard.totalClients')}: ${s?.totalClients ?? 0}`} to="/admin/clients" />
        <Kpi label={t('admin.dashboard.activeSubscribers')} value={s?.activeSubscribers ?? 0}
          icon={<Mail size={20} />} to="/admin/subscribers" />
      </div>

      {/* Alert KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label={t('admin.dashboard.pendingBookings')} value={s?.pendingBookings ?? 0} icon={<Clock size={20} />} to="/admin/bookings" highlight={(s?.pendingBookings ?? 0) > 0} />
        <Kpi label={t('admin.dashboard.unreadMessages')} value={s?.unreadMessages ?? 0} icon={<Inbox size={20} />} to="/admin/inbox" highlight={(s?.unreadMessages ?? 0) > 0} />
        <Kpi label={t('admin.dashboard.agreementsPending')} value={s?.agreementsPending ?? 0} icon={<FileSignature size={20} />} to="/admin/agreements" />
        <Kpi label={t('admin.dashboard.upcomingEvents')} value={s?.upcomingEventsCount ?? 0} icon={<Calendar size={20} />} to="/admin/events" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-1">{t('admin.dashboard.revenueTrend')}</h2>
          <p className="text-brand-gray-muted text-xs mb-3">{t('admin.dashboard.last6mo')}</p>
          <TrendChart values={series?.revenue ?? []} labels={series?.labels ?? []} kind="area" format={(n) => fmtMoney(n)} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-1">{t('admin.dashboard.bookingsTrend')}</h2>
          <p className="text-brand-gray-muted text-xs mb-3">{t('admin.dashboard.last6mo')}</p>
          <TrendChart values={series?.bookings ?? []} labels={series?.labels ?? []} kind="bar" />
        </div>
      </div>

      {/* Breakdown + content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('admin.dashboard.bookingStatus')}</h2>
          <Donut segments={bookingSegments} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('admin.dashboard.contentLibrary')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {contentStats.map((c) => (
              <Link key={c.label} href={c.to} className="rounded-lg bg-brand-gray-light/40 hover:bg-brand-gray-light p-3 transition-colors">
                <div className="text-brand-red mb-1">{c.icon}</div>
                <p className="text-xl font-heading font-bold text-white leading-none">{c.value}</p>
                <p className="text-brand-gray-muted text-xs mt-1">{c.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5"><CalendarDays size={15} /> {t('admin.dashboard.recentBookings')}</h2>
            <Link href="/admin/bookings" className="text-brand-red text-xs hover:underline">{t('admin.dashboard.viewAll')}</Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="px-5 py-8 text-center text-brand-gray-muted text-sm">{t('admin.dashboard.noBookings')}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentBookings.slice(0, 5).map((b) => (
                <div key={b._id} className="px-5 py-3">
                  <p className="text-white text-sm font-medium">{b.client?.firstName} {b.client?.lastName}</p>
                  <p className="text-brand-gray-muted text-xs">{b.service?.title} · {fmtDate(b.scheduledAt)} · {b.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5"><Inbox size={15} /> {t('admin.dashboard.recentMessages')}</h2>
            <Link href="/admin/inbox" className="text-brand-red text-xs hover:underline">{t('admin.dashboard.viewAll')}</Link>
          </div>
          {(data?.recentMessages ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-brand-gray-muted text-sm">{t('admin.dashboard.noMessages')}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {(data?.recentMessages ?? []).slice(0, 5).map((m) => (
                <div key={m._id} className="px-5 py-3 flex items-center gap-2">
                  {m.status === 'unread' && <span className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{m.name}</p>
                    <p className="text-brand-gray-muted text-xs truncate">{m.subject} · {fmtDate(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5"><Activity size={15} /> {t('admin.dashboard.newClientsTitle')}</h2>
            <Link href="/admin/clients" className="text-brand-red text-xs hover:underline">{t('admin.dashboard.viewAll')}</Link>
          </div>
          {(data?.recentSignups ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-brand-gray-muted text-sm">{t('admin.dashboard.noClients')}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {(data?.recentSignups ?? []).slice(0, 5).map((c, i) => (
                <div key={i} className="px-5 py-3">
                  <p className="text-white text-sm font-medium">{c.firstName} {c.lastName}</p>
                  <p className="text-brand-gray-muted text-xs truncate">{c.email} · {fmtDate(c.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="sr-only">{fmtMoneyExact(s?.revenueAllTime ?? 0)}</p>
    </div>
  );
}
