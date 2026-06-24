import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';

// GET /api/messages/unread-count  — admin
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { count, error } = await sb
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread');
  if (error) return fail(error.message, 500);
  return ok({ count: count ?? 0 });
});

export const dynamic = 'force-dynamic';
