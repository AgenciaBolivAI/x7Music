import { getAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { rateLimit, tooMany } from '@/lib/rateLimit';
import { llmConfigured } from '@/lib/llm';
import { runAgent, type ChatMsg } from '@/lib/agent/run';

export const POST = handler(async (req: Request) => {
  // Auth is OPTIONAL: logged-in users get the full role-scoped agent; anonymous
  // visitors get the restricted public agent (published info + public brain only).
  const authedUser = await getAuth();

  // Anonymous traffic is rate-limited harder than authenticated.
  const rl = authedUser
    ? rateLimit(req, 'agent', 30, 5 * 60_000)
    : rateLimit(req, 'agent_public', 15, 5 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!llmConfigured()) return fail('The assistant is not configured yet.', 503);

  const body = await req.json().catch(() => ({}));
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: ChatMsg[] = rawHistory
    .filter((m: unknown): m is ChatMsg => {
      const x = m as { role?: string; content?: unknown };
      return !!x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string';
    })
    .slice(-16)
    .map((m: ChatMsg) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return fail('No question to answer.', 400);
  }

  const caller = authedUser
    ? {
        userId: authedUser.id,
        role: authedUser.role === 'admin' ? ('admin' as const) : ('client' as const),
        firstName: authedUser.firstName || 'there',
      }
    : { userId: '', role: 'public' as const, firstName: 'there' };

  const res = await runAgent({ caller, history });
  if (res.error) return fail(res.error, 502);
  return ok({ answer: res.answer, toolsUsed: res.toolsUsed, pendingAction: res.pendingAction });
});

export const dynamic = 'force-dynamic';
