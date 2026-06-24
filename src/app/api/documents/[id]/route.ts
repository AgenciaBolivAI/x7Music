import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';

export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { data } = await sb.from('documents').select('file_url').eq('id', params.id).maybeSingle();
  if (!data) return fail('Document not found', 404);

  await sb.from('documents').delete().eq('id', params.id);
  await deleteBlob(data.file_url);
  return ok({ message: 'Document deleted' });
});

export const dynamic = 'force-dynamic';
