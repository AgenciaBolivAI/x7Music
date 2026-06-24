import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';

type ProfileRow = {
  id: string; first_name: string; last_name: string; email: string;
  role: string; company: string | null; phone: string | null; avatar_url: string | null;
};

const toUser = (p: ProfileRow) => ({
  id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email,
  role: p.role, company: p.company ?? undefined, phone: p.phone ?? undefined, avatarUrl: p.avatar_url ?? undefined,
});

export const GET = handler(async () => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb
    .from('profiles')
    .select('id, first_name, last_name, email, role, company, phone, avatar_url')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!data) return fail('User not found', 404);
  return ok({ user: toUser(data as ProfileRow) });
});

export const PUT = handler(async (req: Request) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));

  // camelCase (client) → snake_case (db); only string values, whitelisted fields.
  const map: Record<string, string> = { firstName: 'first_name', lastName: 'last_name', phone: 'phone', company: 'company' };
  const updates: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(map)) {
    if (typeof body[camel] === 'string') updates[snake] = body[camel];
  }

  const sb = createClient();
  const { data, error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id) // RLS also enforces self-update
    .select('id, first_name, last_name, email, role, company, phone, avatar_url')
    .maybeSingle();
  if (error || !data) return fail('Could not update profile', 400);
  return ok({ user: toUser(data as ProfileRow) });
});

export const dynamic = 'force-dynamic';
