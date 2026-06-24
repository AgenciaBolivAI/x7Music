import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/resources — public list of free guides. Never exposes file_url
// (the download link is delivered by email / after the request form).
export const GET = handler(async () => {
  const sb = createClient();
  const { data, error } = await sb
    .from('resources')
    .select('title, slug, description, cover_image_url, category')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ resources: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
