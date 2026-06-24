import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, handler } from '@/lib/api';

// DELETE /api/newsletter/:id — admin, delete subscriber
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  await sb.from('subscribers').delete().eq('id', params.id);
  return ok({ message: 'Subscriber deleted' });
});

export const dynamic = "force-dynamic";
