import { createClient } from '@/lib/supabase/server';
import { fail } from './api';

export interface AuthUser {
  id: string;
  role: string;
  firstName: string;
}

/**
 * Resolve the current user from the Supabase session (cookies). Returns null when
 * unauthenticated or the profile is missing/inactive. Replaces the old JWT scheme;
 * the optional `_req` arg is kept so existing call sites compile unchanged.
 */
export async function getAuth(_req?: Request): Promise<AuthUser | null> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('role, is_active, first_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) return null;
  return { id: user.id, role: (profile.role as string) ?? 'client', firstName: (profile.first_name as string) ?? '' };
}

type Guard = { error: ReturnType<typeof fail>; user?: never } | { user: AuthUser; error?: never };

/** Require any authenticated user. */
export async function requireAuth(_req?: Request): Promise<Guard> {
  const user = await getAuth();
  if (!user) return { error: fail('Not authorized', 401) };
  return { user };
}

/** Require an admin user. */
export async function requireAdmin(_req?: Request): Promise<Guard> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.user.role !== 'admin') return { error: fail('Access denied: admins only', 403) };
  return auth;
}
