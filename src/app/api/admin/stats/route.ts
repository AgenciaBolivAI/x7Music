import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const RECENT_COLS =
  'id, scheduled_at, status, payment_status, total_amount, created_at, client:profiles(first_name,last_name,email), service:services(title)';

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const head = { count: 'exact' as const, head: true };

  const [
    allBookings,           // {created_at,total_amount,payment_status,status}
    clientRows,            // {created_at}
    allAgreements,         // {status}
    unreadMessages,
    activeSubscribers,
    publishedArtists,
    publishedReleases,
    upcomingEvents,
    blogPosts,
    catalogEntries,
    recentBookings,
    recentMessages,
    recentSignups,
  ] = await Promise.all([
    sb.from('bookings').select('created_at, total_amount, payment_status, status'),
    sb.from('profiles').select('created_at').eq('role', 'client'),
    sb.from('agreements').select('status'),
    sb.from('messages').select('*', head).eq('status', 'unread'),
    sb.from('subscribers').select('*', head).eq('is_active', true),
    sb.from('artists').select('*', head).eq('is_published', true),
    sb.from('releases').select('*', head).eq('is_published', true),
    sb.from('events').select('*', head).eq('is_published', true).gte('date', now.toISOString()),
    sb.from('blog_posts').select('*', head).eq('is_published', true),
    sb.from('catalog_entries').select('*', head),
    sb.from('bookings').select(RECENT_COLS).order('created_at', { ascending: false }).limit(6),
    sb.from('messages').select('id, name:sender_name, subject, status, created_at').order('created_at', { ascending: false }).limit(6),
    sb.from('profiles').select('first_name, last_name, email, created_at').eq('role', 'client').order('created_at', { ascending: false }).limit(6),
  ]);

  const err = allBookings.error || clientRows.error || unreadMessages.error;
  if (err) return fail(err.message, 500);

  const bookings = (allBookings.data ?? []) as { created_at: string; total_amount: number | null; payment_status: string; status: string }[];
  const clients = (clientRows.data ?? []) as { created_at: string }[];
  const agreements = (allAgreements.data ?? []) as { status: string }[];

  // ── Month buckets (last 6 months, oldest → newest) ──────────────────────────
  const buckets: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: MONTHS[d.getMonth()] });
  }
  const idxByKey = new Map(buckets.map((b, i) => [b.key, i]));
  const revenueSeries = new Array(6).fill(0);
  const bookingSeries = new Array(6).fill(0);
  const clientSeries = new Array(6).fill(0);

  let revenueThisMonth = 0, revenueLastMonth = 0, revenueAllTime = 0;
  let bookingsThisMonth = 0, bookingsLastMonth = 0;
  const bookingStatus: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

  for (const b of bookings) {
    const created = new Date(b.created_at);
    const paid = b.payment_status === 'paid' ? (b.total_amount ?? 0) : 0;
    revenueAllTime += paid;
    bookingStatus[b.status] = (bookingStatus[b.status] ?? 0) + 1;
    const bi = idxByKey.get(monthKey(created));
    if (bi !== undefined) { revenueSeries[bi] += paid; bookingSeries[bi] += 1; }
    if (created >= monthStart) { revenueThisMonth += paid; bookingsThisMonth += 1; }
    else if (created >= lastMonthStart) { revenueLastMonth += paid; bookingsLastMonth += 1; }
  }

  let newClientsThisMonth = 0, newClientsLastMonth = 0;
  for (const c of clients) {
    const created = new Date(c.created_at);
    const ci = idxByKey.get(monthKey(created));
    if (ci !== undefined) clientSeries[ci] += 1;
    if (created >= monthStart) newClientsThisMonth += 1;
    else if (created >= lastMonthStart) newClientsLastMonth += 1;
  }

  const agreementStatus: Record<string, number> = {};
  for (const a of agreements) agreementStatus[a.status] = (agreementStatus[a.status] ?? 0) + 1;
  const agreementsPending = (agreementStatus.sent ?? 0) + (agreementStatus.partially_signed ?? 0) + (agreementStatus.draft ?? 0);

  void sixMonthsAgo; // (kept for clarity; bucketing uses idxByKey)

  return ok({
    stats: {
      // headline
      totalClients: clients.length,
      newClientsThisMonth,
      newClientsLastMonth,
      revenueThisMonth,
      revenueLastMonth,
      revenueAllTime,
      bookingsThisMonth,
      bookingsLastMonth,
      pendingBookings: bookingStatus.pending ?? 0,
      unreadMessages: unreadMessages.count ?? 0,
      upcomingEventsCount: upcomingEvents.count ?? 0,
      activeSubscribers: activeSubscribers.count ?? 0,
      // content
      publishedArtists: publishedArtists.count ?? 0,
      publishedReleases: publishedReleases.count ?? 0,
      blogPosts: blogPosts.count ?? 0,
      catalogEntries: catalogEntries.count ?? 0,
      // agreements
      agreementsPending,
      agreementsCompleted: agreementStatus.completed ?? 0,
    },
    series: {
      labels: buckets.map((b) => b.label),
      revenue: revenueSeries,
      bookings: bookingSeries,
      clients: clientSeries,
    },
    breakdown: { bookingStatus, agreementStatus },
    recentBookings: toCamel(recentBookings.data ?? []),
    recentMessages: toCamel(recentMessages.data ?? []),
    recentSignups: toCamel(recentSignups.data ?? []),
    generatedAt: now.toISOString(),
  });
});

export const dynamic = 'force-dynamic';
