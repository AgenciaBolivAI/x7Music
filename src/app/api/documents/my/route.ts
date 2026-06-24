import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// Columns to expose — never the raw (public) blob URL; clients download via the authed proxy.
const COLS = 'id, client_id, booking_id, title, type, file_size, uploaded_by, created_at';

export const GET = handler(async () => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('documents')
    .select(COLS)
    .eq('client_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ documents: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
