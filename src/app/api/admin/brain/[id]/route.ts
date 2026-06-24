import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, handler } from '@/lib/api';

// DELETE /api/admin/brain/:id
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  await createClient().from('brain_chunks').delete().eq('id', params.id);
  return ok({ message: 'Removed from the brain.' });
});

export const dynamic = 'force-dynamic';
