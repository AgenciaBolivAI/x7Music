import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// Clients see their own bookings only (RLS also enforces). admin_notes excluded.
const COLS = 'id, scheduled_at, duration_minutes, status, payment_status, notes, total_amount, invoice_id, created_at, service:services(title,duration,price,is_free)';

export const GET = handler(async () => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('bookings')
    .select(COLS)
    .eq('client_id', auth.user.id)
    .order('scheduled_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ bookings: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
