import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// PUT /api/bookings/:id/admin-notes  (admin)
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { adminNotes } = await req.json().catch(() => ({}));
  const sb = createClient();
  const { data, error } = await sb
    .from('bookings')
    .update({ admin_notes: typeof adminNotes === 'string' ? adminNotes : '' })
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Booking not found', 404);
  return ok({ booking: toCamel(data) });
});

export const dynamic = 'force-dynamic';
