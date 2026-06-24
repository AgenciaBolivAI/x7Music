import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { ok, fail, handler } from '@/lib/api';
import { rateLimit, tooMany } from '@/lib/rateLimit';
import { sendResourceEmail } from '@/lib/services/email';

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  slug: z.string().trim().min(1).max(120),
  language: z.enum(['en', 'es']).optional(),
});

// POST /api/resources/request — public lead magnet. Captures the visitor as a
// subscriber, emails them the download link, and returns it for instant download.
export const POST = handler(async (req: Request) => {
  const rl = rateLimit(req, 'resource', 8, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail('A valid name and email are required.', 400);
  const { name, email, slug, language } = parsed.data;

  const sb = createServiceClient();
  const { data: resource } = await sb
    .from('resources')
    .select('id, title, file_url, download_count')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (!resource) return fail('Resource not found.', 404);

  // Capture the lead (idempotent — re-requesting just refreshes the subscriber).
  await sb.from('subscribers').upsert(
    {
      email: email.toLowerCase(),
      name,
      ...(language ? { language } : {}),
      source: 'resource',
      is_active: true,
    },
    { onConflict: 'email' }
  );
  await sb
    .from('resources')
    .update({ download_count: (resource.download_count ?? 0) + 1 })
    .eq('id', resource.id);

  // Email is best-effort; the instant download link is returned regardless.
  sendResourceEmail(email, name, resource.title, resource.file_url).catch(console.error);

  return ok({ message: 'Sent', downloadUrl: resource.file_url, title: resource.title }, 201);
});

export const dynamic = 'force-dynamic';
