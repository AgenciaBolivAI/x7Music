import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth';
import {
  sendInquiryAutoReply,
  sendAdminInquiryNotification,
} from '@/lib/services/email';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { rateLimit, tooMany } from '@/lib/rateLimit';

const submitSchema = z.object({
  senderName:  z.string().min(1).max(100),
  senderEmail: z.string().email(),
  subject:     z.string().min(1).max(200),
  body:        z.string().min(1).max(5000),
});

// POST /api/messages  — public (unauthenticated; service client bypasses RLS to insert)
export const POST = handler(async (req: Request) => {
  const rl = rateLimit(req, 'contact', 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, { errors: parsed.error.flatten() });
  }
  const { senderName, senderEmail, subject, body: messageBody } = parsed.data;

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('messages')
    .insert({ sender_name: senderName, sender_email: senderEmail, subject, body: messageBody })
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);

  sendInquiryAutoReply(senderEmail, senderName).catch(console.error);
  sendAdminInquiryNotification(senderName, senderEmail, subject).catch(console.error);

  return ok({ message: toCamel(data) }, 201);
});

// GET /api/messages  — admin
export const GET = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') || undefined;
  const page = parseInt(sp.get('page') || '1');
  const limit = parseInt(sp.get('limit') || '30');
  const from = (page - 1) * limit;

  let q = sb
    .from('messages')
    .select('*, client:profiles(first_name,last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (status) q = q.eq('status', status);
  const { data, count, error } = await q;
  if (error) return fail(error.message, 500);

  const { count: unreadCount } = await sb
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread');

  return ok({ messages: toCamel(data ?? []), total: count ?? 0, unreadCount: unreadCount ?? 0 });
});

export const dynamic = 'force-dynamic';
