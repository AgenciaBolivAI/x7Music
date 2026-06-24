import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/catalog/my  — auth
export const GET = handler(async () => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const sb = createClient();
  const { data, error } = await sb
    .from('catalog_entries')
    .select('*')
    .eq('client_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ entries: toCamel(data ?? []) });
});

export const dynamic = "force-dynamic";
