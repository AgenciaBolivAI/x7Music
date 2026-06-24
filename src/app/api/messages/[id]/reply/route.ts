import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sendInquiryReply } from '@/lib/services/email';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// PUT /api/messages/:id/reply  — admin
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const body = await req.json().catch(() => ({}));
  const { replyText } = body;
  if (!replyText?.trim()) {
    return fail('Reply text is required', 400);
  }

  const { data, error } = await sb
    .from('messages')
    .update({ admin_reply: replyText, status: 'replied', replied_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Message not found', 404);

  sendInquiryReply(data.sender_email, data.sender_name, data.subject, replyText).catch(console.error);
  return ok({ message: toCamel(data) });
});

export const dynamic = 'force-dynamic';
