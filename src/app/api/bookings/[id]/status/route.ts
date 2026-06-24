import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { sendBookingStatusUpdate } from '@/lib/services/email';

// PUT /api/bookings/:id/status  (admin)
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { status } = await req.json().catch(() => ({}));
  const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!valid.includes(status)) return fail(`Status must be one of: ${valid.join(', ')}`, 400);

  const sb = createClient();
  const { data, error } = await sb
    .from('bookings')
    .update({ status })
    .eq('id', params.id)
    .select('*, client:profiles(first_name,email), service:services(title)')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Booking not found', 404);

  const client = (data as { client?: { first_name?: string; email?: string } }).client;
  const service = (data as { service?: { title?: string } }).service;
  if (client?.email) {
    sendBookingStatusUpdate(client.email, client.first_name ?? '', service?.title ?? 'Session', status).catch(console.error);
  }
  return ok({ booking: toCamel(data) });
});

export const dynamic = 'force-dynamic';
