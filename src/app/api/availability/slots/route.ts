import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';

/** Convert "HH:MM" string to minutes since midnight */
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Convert minutes since midnight to "HH:MM" string */
const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Get UTC midnight for a date string "YYYY-MM-DD" */
const dayBounds = (dateStr: string) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end   = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
};

// GET /api/availability/slots  — ?date=YYYY-MM-DD&serviceId=xxx
export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') as string;
  const serviceId = searchParams.get('serviceId') as string;

  if (!date || !serviceId) {
    return fail('date and serviceId are required', 400);
  }

  const { data: service } = await sb.from('services').select('*').eq('id', serviceId).maybeSingle();
  if (!service || !service.is_active) {
    return fail('Service not found', 404);
  }

  // 1. Is this specific date blocked?
  const { start: dayStart, end: dayEnd } = dayBounds(date);
  const { data: dateBlock } = await sb
    .from('availability')
    .select('id')
    .eq('specific_date', date)
    .eq('is_blocked', true)
    .maybeSingle();
  if (dateBlock) {
    return ok({ slots: [], reason: 'Date is blocked' });
  }

  // 2. Get weekly schedule for this day-of-week
  const dayOfWeek = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const { data: schedule } = await sb
    .from('availability')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .is('specific_date', null)
    .eq('is_blocked', false)
    .maybeSingle();
  if (!schedule) {
    return ok({ slots: [], reason: 'No availability set for this day' });
  }

  const buffer   = schedule.buffer_minutes ?? 15;
  const slotSize = service.duration + buffer;  // total time a slot occupies
  const openAt   = timeToMinutes(schedule.start_time);
  const closeAt  = timeToMinutes(schedule.end_time);

  // 3. Generate all theoretical slots
  const allSlots: string[] = [];
  for (let t = openAt; t + service.duration <= closeAt; t += slotSize) {
    allSlots.push(minutesToTime(t));
  }

  // 4. Get existing (non-cancelled) bookings for this date
  const { data: existing } = await sb
    .from('bookings')
    .select('scheduled_at, duration_minutes')
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())
    .in('status', ['pending', 'confirmed']);

  // 5. Filter out conflicting slots
  const available = allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd   = slotStart + service.duration;

    return !(existing ?? []).some((b) => {
      const at     = new Date(b.scheduled_at);
      const bTime  = `${String(at.getUTCHours()).padStart(2,'0')}:${String(at.getUTCMinutes()).padStart(2,'0')}`;
      const bStart = timeToMinutes(bTime);
      const bEnd   = bStart + b.duration_minutes + buffer;
      // Overlap check
      return slotStart < bEnd && slotEnd > bStart;
    });
  });

  return ok({ slots: available, date, serviceId });
});

export const dynamic = "force-dynamic";
