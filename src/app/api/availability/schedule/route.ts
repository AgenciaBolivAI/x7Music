import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/availability/schedule  (admin)
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sb = createClient();
  const { data: schedules, error: schedErr } = await sb
    .from('availability')
    .select('*')
    .is('specific_date', null)
    .order('day_of_week', { ascending: true });
  if (schedErr) return fail(schedErr.message, 500);

  const { data: blocks, error: blockErr } = await sb
    .from('availability')
    .select('*')
    .not('specific_date', 'is', null)
    .order('specific_date', { ascending: true });
  if (blockErr) return fail(blockErr.message, 500);

  return ok({ schedules: toCamel(schedules ?? []), blocks: toCamel(blocks ?? []) });
});

// POST /api/availability/schedule  (admin)
const scheduleSchema = z.object({
  entries: z.array(z.object({
    dayOfWeek:     z.number().int().min(0).max(6),
    startTime:     z.string().regex(/^\d{2}:\d{2}$/),
    endTime:       z.string().regex(/^\d{2}:\d{2}$/),
    isBlocked:     z.boolean().default(false),
    bufferMinutes: z.number().int().min(0).max(120).default(15),
  })),
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid schedule data', 400, { errors: parsed.error.flatten() });
  }

  const sb = createClient();
  // Replace all weekly schedules (delete + re-insert)
  const { error: delErr } = await sb.from('availability').delete().is('specific_date', null);
  if (delErr) return fail(delErr.message, 400);

  const rows = parsed.data.entries.map((e) => ({
    day_of_week:    e.dayOfWeek,
    start_time:     e.startTime,
    end_time:       e.endTime,
    is_blocked:     e.isBlocked,
    buffer_minutes: e.bufferMinutes,
  }));
  const { data, error } = await sb.from('availability').insert(rows).select('*');
  if (error) return fail(error.message, 400);
  return ok({ schedules: toCamel(data ?? []) });
});

export const dynamic = "force-dynamic";
