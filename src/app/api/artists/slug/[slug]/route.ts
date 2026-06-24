import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { PUBLIC_ARTIST_COLUMNS } from '@/lib/artistFields';

// GET /api/artists/slug/:slug — public, find by slug (PII projected out)
export const GET = handler(async (_req: Request, { params }: { params: { slug: string } }) => {
  const sb = createClient();
  const { data, error } = await sb
    .from('artists')
    .select(PUBLIC_ARTIST_COLUMNS)
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Artist not found', 404);
  return ok({ artist: toCamel(data) });
});

export const dynamic = 'force-dynamic';
