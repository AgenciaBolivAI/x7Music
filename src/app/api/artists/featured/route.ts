import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { PUBLIC_ARTIST_COLUMNS } from '@/lib/artistFields';

// GET /api/artists/featured — public, featured artists (PII projected out)
export const GET = handler(async () => {
  const sb = createClient();
  const { data, error } = await sb
    .from('artists')
    .select(PUBLIC_ARTIST_COLUMNS)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(4);
  if (error) return fail(error.message, 500);
  return ok({ artists: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
