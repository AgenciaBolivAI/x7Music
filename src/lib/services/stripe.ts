import { getStripe } from '../stripe';
import { createServiceClient } from '../supabase/service';

export interface CheckoutClient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  stripeCustomerId?: string | null;
}

export const createCheckoutSession = async (
  booking: { id: string },
  service: { title: string; price: number; duration: number },
  client: CheckoutClient
): Promise<{ id: string; url: string }> => {
  const stripe = getStripe();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  // Ensure a Stripe customer, persisted immediately so repeated attempts don't
  // create duplicates. profiles update goes through the service client (no user
  // session in the webhook path; RLS would block a client self-updating anyway).
  let customerId = client.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: `${client.firstName} ${client.lastName}`.trim(),
      metadata: { userId: client.id },
    });
    customerId = customer.id;
    await createServiceClient().from('profiles').update({ stripe_customer_id: customerId }).eq('id', client.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: service.price,
          product_data: {
            name: service.title,
            description: `${service.duration}-minute session with Steven Pantojas — X7 Music Group`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: booking.id, userId: client.id, customerId },
    success_url: `${clientUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/book?cancelled=1`,
  });

  return { id: session.id, url: session.url ?? '' };
};
