import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';

// Supabase manages credentials; an active session is the authorization. We update
// the password via the session-bound client. (Supabase doesn't re-verify the
// current password — the logged-in session is the proof.)
export const PUT = handler(async (req: Request) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { newPassword } = await req.json().catch(() => ({}));
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return fail('New password must be at least 8 characters.', 400);
  }

  const sb = createClient();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return fail(error.message || 'Could not change password', 400);
  return ok({ message: 'Password changed successfully' });
});

export const dynamic = 'force-dynamic';
