import { requireAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { dispatchTool, WRITE_TOOL_NAMES } from '@/lib/agent/tools';

// Executes a write action the assistant proposed — the ONLY path where a write
// tool runs with confirm:true. Triggered by the user clicking "Confirm" in the
// chat UI, never by the model. The role gate inside dispatchTool re-checks that
// the caller may run this tool.
export const POST = handler(async (req: Request) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { name, args } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !WRITE_TOOL_NAMES.has(name)) {
    return fail('That action is not allowed.', 400);
  }

  const caller = {
    userId: auth.user.id,
    role: auth.user.role === 'admin' ? ('admin' as const) : ('client' as const),
    firstName: auth.user.firstName || 'there',
  };

  const result = await dispatchTool(
    name,
    { ...((args as Record<string, unknown>) ?? {}), confirm: true },
    caller,
    { allowWrite: true }
  );
  const r = result as { error?: string; ok?: boolean; message?: string };
  if (r?.error) return fail(String(r.error), 400);
  return ok({ message: r?.message || 'Done.' });
});

export const dynamic = 'force-dynamic';
