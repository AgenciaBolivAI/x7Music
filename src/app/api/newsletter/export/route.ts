import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

interface SubscriberRow {
  email: string;
  name?: string;
  language: string;
  createdAt: string;
}

// GET /api/newsletter/export — admin, returns CSV
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { data, error } = await sb
    .from('subscribers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);

  const subscribers = toCamel<SubscriberRow[]>(data ?? []);
  const header = 'email,name,language,subscribedAt';
  const rows = subscribers.map((s) => {
    const created = new Date(s.createdAt);
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    return [esc(s.email), esc(s.name || ''), s.language, created.toISOString()].join(',');
  });
  return new Response([header, ...rows].join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="x7-subscribers.csv"',
    },
  });
});

export const dynamic = "force-dynamic";
