import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// POST /api/availability/block  (admin)
const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid date format (expected YYYY-MM-DD)', 400);
  }

  const sb = createClient();
  // Upsert: if already blocked, leave it; otherwise create
  const { data: existing } = await sb
    .from('availability')
    .select('id')
    .eq('specific_date', parsed.data.date)
    .maybeSingle();

  if (existing) {
    return fail('Date already has an entry. Remove it first.', 400);
  }

  const { data, error } = await sb
    .from('availability')
    .insert({ specific_date: parsed.data.date, is_blocked: true })
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ block: toCamel(data) }, 201);
});

export const dynamic = "force-dynamic";
