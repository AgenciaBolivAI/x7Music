import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// PUT /api/messages/:id/read  — admin
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { data, error } = await sb
    .from('messages')
    .update({ status: 'read' })
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Message not found', 404);
  return ok({ message: toCamel(data) });
});

export const dynamic = 'force-dynamic';
