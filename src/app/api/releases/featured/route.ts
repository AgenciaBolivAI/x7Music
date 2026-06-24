import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

export const GET = handler(async () => {
  const sb = createClient();
  const { data, error } = await sb
    .from('releases')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('release_date', { ascending: false })
    .limit(6);
  if (error) return fail(error.message, 500);
  return ok({ releases: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
