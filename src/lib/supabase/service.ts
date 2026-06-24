import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client — BYPASSES RLS. Server-only. Use ONLY for trusted system
 * operations that legitimately span users: the Stripe webhook, newsletter
 * broadcasts, public subscribe/contact/resource-request writes, and admin tools
 * that need cross-user reads. Never import this into client code.
 */
export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
