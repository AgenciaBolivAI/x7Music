import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/newsletter — admin, list subscribers
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ subscribers: toCamel(data ?? []) });
});

export const dynamic = "force-dynamic";
