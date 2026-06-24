import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb.from('split_sheets').select('*').eq('id', params.id).maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Split sheet not found', 404);
  return ok({ splitSheet: toCamel(data) });
});

export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  await sb.from('split_sheets').delete().eq('id', params.id);
  return ok({ message: 'Split sheet deleted' });
});

export const dynamic = 'force-dynamic';
