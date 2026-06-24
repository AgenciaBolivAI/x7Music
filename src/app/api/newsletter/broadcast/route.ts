import { z } from 'zod';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth';
import { sendNewsletterEmail } from '@/lib/services/email';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const broadcastSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  audience: z.enum(['all', 'en', 'es']).optional().default('all'),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().url().max(500).optional(),
});

// Escape user-entered text, then turn newlines into <br/> so the admin can write plain text safely.
const textToHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

// Send in small sequential batches so we don't open dozens of SMTP connections at once.
async function sendInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));
  }
  return { sent, failed };
}

interface SubscriberRow {
  id: string;
  email: string;
  unsubscribe_token: string | null;
}

// POST /api/newsletter/broadcast — admin (uses the service client to read all
// active subscribers across users and write the campaign log).
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const reqBody = await req.json().catch(() => ({}));
  const parsed = broadcastSchema.safeParse(reqBody);
  if (!parsed.success) {
    return fail('Subject and message are required.', 400);
  }
  const { subject, body, audience, ctaLabel, ctaUrl } = parsed.data;

  const sb = createServiceClient();
  let query = sb.from('subscribers').select('id, email, unsubscribe_token').eq('is_active', true);
  if (audience !== 'all') query = query.eq('language', audience);
  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  const subscribers = (data ?? []) as SubscriberRow[];

  if (subscribers.length === 0) {
    return fail('No active subscribers match this audience.', 400);
  }

  const bodyHtml = textToHtml(body);
  const cta = ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined;
  const baseUrl = process.env.CLIENT_URL || '';

  const { sent, failed } = await sendInBatches(subscribers, 5, async (sub) => {
    // Backfill a token for any legacy subscriber created before tokens existed.
    let token = sub.unsubscribe_token;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      await sb.from('subscribers').update({ unsubscribe_token: token }).eq('id', sub.id);
    }
    const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${token}`;
    await sendNewsletterEmail(sub.email, subject, bodyHtml, unsubscribeUrl, cta);
  });

  const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
  const { data: campaign, error: campaignError } = await sb
    .from('campaigns')
    .insert({
      subject,
      body,
      cta_label: ctaLabel ?? null,
      cta_url: ctaUrl ?? null,
      audience,
      recipient_count: subscribers.length,
      sent_count: sent,
      failed_count: failed,
      status,
      sent_by: auth.user.id,
    })
    .select('*')
    .maybeSingle();
  if (campaignError) return fail(campaignError.message, 400);

  return ok({ campaign: toCamel(campaign) }, 201);
});

export const dynamic = "force-dynamic";
