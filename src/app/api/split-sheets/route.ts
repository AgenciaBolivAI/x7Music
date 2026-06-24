import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const writerSchema = z.object({
  artist: z.string().optional(),
  name: z.string().min(1),
  role: z.enum(['writer', 'composer', 'producer', 'publisher', 'other']).default('writer'),
  pro: z.string().optional(),
  ipi: z.string().optional(),
  publisher: z.string().optional(),
  percentage: z.number().min(0).max(100),
});

const splitSheetSchema = z.object({
  songTitle: z.string().min(1).max(200),
  workDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  writers: z.array(writerSchema).min(1),
});

export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('split_sheets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ splitSheets: toCamel(data ?? []) });
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const body = await req.json().catch(() => ({}));
  const parsed = splitSheetSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const total = parsed.data.writers.reduce((s, w) => s + w.percentage, 0);
  if (Math.round(total * 100) !== 10000) {
    return fail(`Splits must total 100% (currently ${Math.round(total * 100) / 100}%)`, 400);
  }

  const row = {
    song_title: parsed.data.songTitle,
    work_date: parsed.data.workDate ? new Date(parsed.data.workDate).toISOString() : null,
    notes: parsed.data.notes ?? null,
    writers: parsed.data.writers,
    created_by: auth.user.id,
  };
  const { data, error } = await sb.from('split_sheets').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ splitSheet: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
