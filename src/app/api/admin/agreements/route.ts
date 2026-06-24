import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { agreementCreateSchema } from '@/lib/agreements';

// GET /api/admin/agreements — list agreements with signer summaries
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('agreements')
    .select('id, type, title, status, created_at, updated_at, signers:agreement_signers(id, name, email, role, status, token, sort_order)')
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ agreements: toCamel(data ?? []) });
});

// POST /api/admin/agreements — create a draft agreement + its signer slots
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = agreementCreateSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const { type, title, data, signers } = parsed.data;

  // Soft guard: split-sheet writer percentages should total 100%.
  if (type === 'split_sheet' && Array.isArray((data as { writers?: unknown }).writers)) {
    const writers = (data as { writers: { percentage?: number }[] }).writers;
    const total = writers.reduce((s, w) => s + (Number(w.percentage) || 0), 0);
    if (writers.length && Math.round(total * 100) !== 10000) {
      return fail(`Splits must total 100% (currently ${Math.round(total * 100) / 100}%)`, 400);
    }
  }

  const sb = createClient();
  const { data: agreement, error } = await sb
    .from('agreements')
    .insert({ type, title, data, created_by: auth.user.id })
    .select('*')
    .maybeSingle();
  if (error || !agreement) return fail(error?.message ?? 'Could not create agreement', 400);

  const signerRows = signers.map((s, i) => ({
    agreement_id: agreement.id,
    artist_id: s.artistId ?? null,
    name: s.name,
    email: s.email,
    role: s.role ?? null,
    sort_order: i,
  }));
  const { data: inserted, error: sErr } = await sb
    .from('agreement_signers')
    .insert(signerRows)
    .select('id, name, email, role, status, sort_order');
  if (sErr) {
    // roll back the agreement so we don't leave a signer-less draft
    await sb.from('agreements').delete().eq('id', agreement.id);
    return fail(sErr.message, 400);
  }

  return ok({ agreement: toCamel({ ...agreement, signers: inserted }) }, 201);
});

export const dynamic = 'force-dynamic';
