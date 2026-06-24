import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { agreementUpdateSchema } from '@/lib/agreements';

// GET /api/admin/agreements/:id — full detail incl. signer tokens (admin only)
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('agreements')
    .select('*, signers:agreement_signers(*)')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Agreement not found', 404);
  return ok({ agreement: toCamel(data) });
});

// PATCH /api/admin/agreements/:id — edit a DRAFT (title/data/signers)
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const body = await req.json().catch(() => ({}));
  const parsed = agreementUpdateSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const { data: existing } = await sb.from('agreements').select('status').eq('id', params.id).maybeSingle();
  if (!existing) return fail('Agreement not found', 404);
  if (existing.status !== 'draft') return fail('Only draft agreements can be edited', 409);

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.data !== undefined) updates.data = parsed.data.data;
  if (Object.keys(updates).length) {
    const { error } = await sb.from('agreements').update(updates).eq('id', params.id);
    if (error) return fail(error.message, 400);
  }

  // Replace signer slots wholesale when provided (draft only, so no signatures lost).
  if (parsed.data.signers) {
    await sb.from('agreement_signers').delete().eq('agreement_id', params.id);
    const rows = parsed.data.signers.map((s, i) => ({
      agreement_id: params.id,
      artist_id: s.artistId ?? null,
      name: s.name,
      email: s.email,
      role: s.role ?? null,
      phone: s.phone ?? null,
      address: s.address ?? null,
      sort_order: i,
    }));
    const { error } = await sb.from('agreement_signers').insert(rows);
    if (error) return fail(error.message, 400);
  }

  const { data } = await sb.from('agreements').select('*, signers:agreement_signers(*)').eq('id', params.id).maybeSingle();
  return ok({ agreement: toCamel(data) });
});

// DELETE /api/admin/agreements/:id — cascade removes signers
export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { error } = await sb.from('agreements').delete().eq('id', params.id);
  if (error) return fail(error.message, 400);
  return ok({ message: 'Agreement deleted' });
});

export const dynamic = 'force-dynamic';
