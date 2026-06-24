import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { createCheckoutSession } from '@/lib/services/stripe';
import { sendBookingConfirmation, sendAdminBookingNotification } from '@/lib/services/email';

const createBookingSchema = z.object({
  serviceId:   z.string().min(1),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO datetime string' }),
  notes:       z.string().max(1000).optional().default(''),
});

const toMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ── POST /api/bookings ──────────────────────────────────────────────────────
export const POST = handler(async (req: Request) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const clientId = auth.user.id;

  const body = await req.json().catch(() => ({}));
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return fail('Invalid data', 400, { errors: parsed.error.flatten() });
  const { serviceId, scheduledAt, notes } = parsed.data;

  // Server-trusted flow: auth is enforced and client_id is forced to the caller,
  // so booking creation uses the service client (also needed to see ALL bookings
  // for conflict detection, which a client's RLS-scoped session cannot).
  const svc = createServiceClient();

  const [{ data: service }, { data: profile }] = await Promise.all([
    svc.from('services').select('*').eq('id', serviceId).maybeSingle(),
    svc.from('profiles').select('first_name, last_name, email, stripe_customer_id').eq('id', clientId).maybeSingle(),
  ]);
  if (!service || !service.is_active) return fail('Service not found', 404);
  if (!profile) return fail('User not found', 404);

  const date = new Date(scheduledAt);
  const dateStr = date.toISOString().slice(0, 10);
  const dow = date.getUTCDay();

  const { data: schedule } = await svc
    .from('availability')
    .select('*').eq('day_of_week', dow).is('specific_date', null).eq('is_blocked', false).maybeSingle();
  if (!schedule) return fail('That day is not available', 400);

  const { data: blocked } = await svc
    .from('availability')
    .select('id').eq('is_blocked', true).eq('specific_date', dateStr).maybeSingle();
  if (blocked) return fail('That date is not available', 400);

  const reqStart = date.getUTCHours() * 60 + date.getUTCMinutes();
  const reqEnd = reqStart + service.duration;
  if (reqStart < toMinutes(schedule.start_time) || reqEnd > toMinutes(schedule.end_time)) {
    return fail('That time is outside available hours', 400);
  }

  // Conflict check across ALL bookings that day (service client bypasses RLS).
  const { data: conflicts } = await svc
    .from('bookings')
    .select('scheduled_at, duration_minutes, status')
    .gte('scheduled_at', `${dateStr}T00:00:00.000Z`)
    .lte('scheduled_at', `${dateStr}T23:59:59.999Z`)
    .in('status', ['pending', 'confirmed']);
  const buffer = schedule.buffer_minutes ?? 15;
  const hasConflict = (conflicts ?? []).some((b) => {
    const bs = new Date(b.scheduled_at as string);
    const bStart = bs.getUTCHours() * 60 + bs.getUTCMinutes();
    const bEnd = bStart + (b.duration_minutes as number) + buffer;
    return reqStart < bEnd && reqEnd > bStart;
  });
  if (hasConflict) return fail('That time slot is no longer available. Please choose another.', 409);

  const { data: booking, error: insErr } = await svc.from('bookings').insert({
    client_id: clientId,
    service_id: service.id,
    scheduled_at: date.toISOString(),
    duration_minutes: service.duration,
    notes,
    total_amount: service.price,
    payment_status: service.is_free ? 'waived' : 'unpaid',
    status: service.is_free ? 'confirmed' : 'pending',
  }).select('*').maybeSingle();
  if (insErr || !booking) return fail(insErr?.message || 'Could not create booking', 400);

  if (service.is_free) {
    sendBookingConfirmation(profile.email, profile.first_name, service.title, date).catch(console.error);
    sendAdminBookingNotification(`${profile.first_name} ${profile.last_name}`, service.title, date).catch(console.error);
    return ok({ booking: toCamel(booking), checkoutUrl: null }, 201);
  }

  try {
    const session = await createCheckoutSession(
      { id: booking.id as string },
      { title: service.title, price: service.price, duration: service.duration },
      {
        id: clientId,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        stripeCustomerId: profile.stripe_customer_id,
      }
    );
    await svc.from('bookings').update({ stripe_checkout_session_id: session.id }).eq('id', booking.id);
    return ok({ booking: toCamel(booking), checkoutUrl: session.url, sessionId: session.id }, 201);
  } catch (err) {
    await svc.from('bookings').delete().eq('id', booking.id); // roll back
    throw err;
  }
});

// ── GET /api/bookings  (admin) ──────────────────────────────────────────────
export const GET = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const start = (page - 1) * limit;

  let q = sb
    .from('bookings')
    .select('*, client:profiles(first_name,last_name,email,company), service:services(title,duration,price,is_free)', { count: 'exact' })
    .order('scheduled_at', { ascending: false })
    .range(start, start + limit - 1);
  if (status) q = q.eq('status', status);
  if (from) q = q.gte('scheduled_at', new Date(from).toISOString());
  if (to) q = q.lte('scheduled_at', new Date(to).toISOString());

  const { data, count, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ bookings: toCamel(data ?? []), total: count ?? 0, page, limit });
});

export const dynamic = 'force-dynamic';
