import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// PATCH /api/admin/resources/:id — toggle active (body: { isActive })
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const body = await req.json().catch(() => ({}));
  const { data, error } = await sb
    .from('resources')
    .update({ is_active: body.isActive === true })
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Resource not found', 404);
  return ok({ resource: toCamel(data) });
});

// DELETE /api/admin/resources/:id
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb
    .from('resources')
    .select('file_url, cover_image_url')
    .eq('id', params.id)
    .maybeSingle();
  await sb.from('resources').delete().eq('id', params.id);
  if (data?.file_url) await deleteBlob(data.file_url);
  if (data?.cover_image_url) await deleteBlob(data.cover_image_url);
  return ok({ message: 'Resource deleted' });
});

export const dynamic = 'force-dynamic';
