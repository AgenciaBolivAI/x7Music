import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { ok, fail, handler } from '@/lib/api';
import { rateLimit, tooMany } from '@/lib/rateLimit';

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  language: z.enum(['en', 'es']).optional(),
  source: z.enum(['footer', 'contact']).optional(),
});

// POST /api/newsletter/subscribe — public
export const POST = handler(async (req: Request) => {
  const rl = rateLimit(req, 'subscribe', 10, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await req.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return fail('A valid email is required', 400);
  }
  const { email, name, language, source } = parsed.data;

  // Re-subscribing an existing email just reactivates it — idempotent for the public form
  const sb = createServiceClient();
  const row = {
    email: email.toLowerCase(),
    ...(name ? { name } : {}),
    ...(language ? { language } : {}),
    source: source || 'footer',
    is_active: true,
  };
  const { error } = await sb.from('subscribers').upsert(row, { onConflict: 'email' });
  if (error) return fail(error.message, 400);
  return ok({ message: 'Subscribed' }, 201);
});

export const dynamic = "force-dynamic";
