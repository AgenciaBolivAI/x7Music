import { createClient } from '@/lib/supabase/server';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

export const GET = handler(async () => {
  const sb = createClient();
  const { data, error } = await sb
    .from('events')
    .select('*')
    .eq('is_published', true)
    .lt('date', new Date().toISOString())
    .order('date', { ascending: false })
    .limit(20);
  if (error) return fail(error.message, 500);
  return ok({ events: toCamel(data ?? []) });
});

export const dynamic = 'force-dynamic';
