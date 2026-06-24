'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (client components). Reads the public anon key.
 *
 * Falls back to harmless placeholders when the env vars are absent so static
 * prerendering during `next build` doesn't crash before the project is
 * provisioned. The client is created during prerender but never called there
 * (auth calls run in a browser-only effect); on Vercel the real NEXT_PUBLIC_*
 * values are inlined at build time.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );
}
