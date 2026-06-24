import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';

/** Convert "HH:MM" string to minutes since midnight */
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Get UTC midnight for a date string "YYYY-MM-DD" */
const dayBounds = (dateStr: string) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end   = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
};

// GET /api/availability/calendar  — ?year=2026&month=3&serviceId=xxx  (month is 1-based)
// Returns array of "YYYY-MM-DD" strings that have at least one open slot
export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') as string;
  const month = searchParams.get('month') as string;
  const serviceId = searchParams.get('serviceId') as string;

  if (!year || !month || !serviceId) {
    return fail('year, month, and serviceId are required', 400);
  }

  const { data: service } = await sb.from('services').select('*').eq('id', serviceId).maybeSingle();
  if (!service || !service.is_active) {
    return fail('Service not found', 404);
  }

  const y = parseInt(year);
  const m = parseInt(month) - 1; // JS month is 0-based
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Fetch all schedules and blocks for the month once
  const monthStart = new Date(Date.UTC(y, m, 1));
  const monthEnd   = new Date(Date.UTC(y, m, daysInMonth, 23, 59, 59));
  const { data: blockedDates } = await sb
    .from('availability')
    .select('specific_date')
    .gte('specific_date', monthStart.toISOString().slice(0, 10))
    .lte('specific_date', monthEnd.toISOString().slice(0, 10))
    .eq('is_blocked', true);
  const blockedSet = new Set(
    (blockedDates ?? []).map((b) => String(b.specific_date).slice(0, 10))
  );

  // Bookings for the month
  const { data: bookings } = await sb
    .from('bookings')
    .select('scheduled_at')
    .gte('scheduled_at', monthStart.toISOString())
    .lte('scheduled_at', monthEnd.toISOString())
    .in('status', ['pending', 'confirmed']);

  const { data: schedules } = await sb
    .from('availability')
    .select('*')
    .is('specific_date', null)
    .eq('is_blocked', false);
  const scheduleMap = new Map((schedules ?? []).map((s) => [s.day_of_week, s]));

  const availableDates: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(y, m, d));
    if (date < today) continue;                       // skip past dates

    const dateStr  = date.toISOString().slice(0, 10);
    const dow      = date.getUTCDay();
    const schedule = scheduleMap.get(dow);

    if (!schedule || blockedSet.has(dateStr)) continue;

    const buffer   = schedule.buffer_minutes ?? 15;
    const slotSize = service.duration + buffer;
    const openAt   = timeToMinutes(schedule.start_time);
    const closeAt  = timeToMinutes(schedule.end_time);

    // Count slots
    const totalSlots = Math.floor((closeAt - openAt) / slotSize);
    if (totalSlots <= 0) continue;

    // Count bookings on this date
    const { start: ds, end: de } = dayBounds(dateStr);
    const dayBookings = (bookings ?? []).filter((b) => {
      const at = new Date(b.scheduled_at);
      return at >= ds && at <= de;
    });

    if (dayBookings.length < totalSlots) {
      availableDates.push(dateStr);
    }
  }

  return ok({ availableDates });
});

export const dynamic = "force-dynamic";
