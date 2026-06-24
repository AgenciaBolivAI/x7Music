import { createServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe';
import { sendBookingConfirmation } from '@/lib/services/email';
import { ok, fail, handler } from '@/lib/api';

type Svc = ReturnType<typeof createServiceClient>;

const generateInvoiceNumber = async (svc: Svc): Promise<string> => {
  const { count } = await svc.from('invoices').select('*', { count: 'exact', head: true });
  return `X7-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`;
};

const confirmBookingAfterPayment = async (
  svc: Svc,
  sessionId: string,
  paymentIntentId: string,
  customerId: string,
  userId: string
): Promise<void> => {
  const { data: booking } = await svc
    .from('bookings')
    .select('*, service:services(title,price), client:profiles(first_name,email)')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();
  if (!booking) return;

  // Idempotent: ignore replays once fulfilled.
  if (booking.payment_status === 'paid' || booking.invoice_id) return;

  await svc.from('bookings').update({
    status: 'confirmed',
    payment_status: 'paid',
    stripe_payment_intent_id: paymentIntentId,
  }).eq('id', booking.id);

  if (userId) await svc.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);

  const service = (booking.service ?? {}) as { title?: string };
  const amount = booking.total_amount as number;
  const invoiceNumber = await generateInvoiceNumber(svc);
  const { data: invoice } = await svc.from('invoices').insert({
    invoice_number: invoiceNumber,
    client_id: booking.client_id,
    booking_id: booking.id,
    line_items: [{ description: service.title ?? 'Session', quantity: 1, unitPrice: amount, total: amount }],
    subtotal: amount,
    tax: 0,
    total: amount,
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).select('id').maybeSingle();
  if (invoice) await svc.from('bookings').update({ invoice_id: invoice.id }).eq('id', booking.id);

  const client = (booking.client ?? {}) as { first_name?: string; email?: string };
  if (client.email) {
    sendBookingConfirmation(client.email, client.first_name ?? '', service.title ?? 'Session', new Date(booking.scheduled_at as string)).catch(console.error);
  }
};

// POST /api/payments/webhook — RAW body for Stripe signature verification.
export const POST = handler(async (req: Request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return fail('Webhook secret not configured', 500);

  const raw = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature error:', err instanceof Error ? err.message : err);
    return fail('Webhook signature verification failed', 400);
  }

  const svc = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as {
        id: string; payment_status: string; payment_intent: string; customer: string;
        metadata: { userId?: string };
      };
      if (session.payment_status === 'paid') {
        await confirmBookingAfterPayment(svc, session.id, session.payment_intent, session.customer, session.metadata?.userId ?? '');
      }
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as { payment_intent: string };
      await svc.from('bookings')
        .update({ payment_status: 'unpaid', status: 'cancelled' })
        .eq('stripe_payment_intent_id', charge.payment_intent);
      break;
    }
    default:
      break;
  }

  return ok({ received: true });
});

export const dynamic = 'force-dynamic';
