import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

export const GET = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const sp = new URL(req.url).searchParams;
  const search = sp.get('search') || undefined;
  const page = sp.get('page') || '1';
  const limit = sp.get('limit') || '20';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // profiles has no password fields, so a plain select is safe.
  let q = sb
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .range(skip, skip + parseInt(limit) - 1);

  if (search) {
    // Escape PostgREST `or`/`ilike` metacharacters (% _ , ( )) to prevent unintended matching.
    const safe = search.replace(/[%_,()\\]/g, '\\$&');
    q = q.or(
      `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`
    );
  }

  const { data, count, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ clients: toCamel(data ?? []), total: count ?? 0 });
});

export const dynamic = "force-dynamic";
