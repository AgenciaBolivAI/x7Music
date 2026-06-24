import { createServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe';
import { requireAuth } from '@/lib/auth';
import { fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { NextResponse } from 'next/server';

// GET /api/payments/session/:sessionId — owner-or-admin (prevents IDOR).
export const GET = handler(async (req: Request, { params }: { params: { sessionId: string } }) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const isAdmin = auth.user.role === 'admin';

  // Service client to look the booking up by session id; ownership enforced below.
  const svc = createServiceClient();
  const cols = isAdmin
    ? '*, service:services(title,duration)'
    : 'id, client_id, scheduled_at, duration_minutes, status, payment_status, total_amount, created_at, service:services(title,duration)';
  const { data: booking } = await svc
    .from('bookings')
    .select(cols)
    .eq('stripe_checkout_session_id', params.sessionId)
    .maybeSingle();
  if (!booking) return fail('Booking not found', 404);

  const isOwner = (booking as { client_id?: string }).client_id === auth.user.id;
  if (!isOwner && !isAdmin) return fail('Forbidden', 403);

  const session = await getStripe().checkout.sessions.retrieve(params.sessionId);
  return NextResponse.json({ success: true, paymentStatus: session.payment_status, booking: toCamel(booking) });
});

export const dynamic = 'force-dynamic';
