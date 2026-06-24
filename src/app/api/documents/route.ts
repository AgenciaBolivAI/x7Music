import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// Columns to expose — never the raw (public) blob URL; clients download via the authed proxy.
const COLS = 'id, client_id, booking_id, title, type, file_size, uploaded_by, created_at, client:profiles(first_name,last_name,email)';

export const GET = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const clientId = new URL(req.url).searchParams.get('clientId') || undefined;
  let q = sb.from('documents').select(COLS).order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ documents: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
