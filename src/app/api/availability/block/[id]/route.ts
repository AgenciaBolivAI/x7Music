import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, handler } from '@/lib/api';

// DELETE /api/availability/block/:id  (admin)
export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sb = createClient();
  await sb.from('availability').delete().eq('id', params.id);
  return ok({ message: 'Date unblocked' });
});

export const dynamic = "force-dynamic";
