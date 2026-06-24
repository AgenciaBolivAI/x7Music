import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server Supabase client bound to the request cookies (route handlers + server
 * components). Carries the signed-in user's session, so RLS applies as that user.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Server Components cookie writes throw — the middleware refreshes the
          // session, so it's safe to ignore here.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore */
          }
        },
      },
    }
  );
}
