import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const ADMIN_COLS = '*, client:profiles(first_name,last_name,email,company,phone), service:services(title,duration,price)';
// Non-admin (owner) view: no admin_notes.
const OWNER_COLS = 'id, client_id, service_id, scheduled_at, duration_minutes, status, payment_status, notes, total_amount, invoice_id, created_at, service:services(title,duration,price)';

// GET /api/bookings/:id — owner or admin (RLS enforces; non-owner select returns nothing → 404).
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const isAdmin = auth.user.role === 'admin';
  const sb = createClient();

  const { data, error } = await sb
    .from('bookings')
    .select(isAdmin ? ADMIN_COLS : OWNER_COLS)
    .eq('id', params.id)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Booking not found', 404);
  return ok({ booking: toCamel(data) });
});

export const dynamic = 'force-dynamic';
