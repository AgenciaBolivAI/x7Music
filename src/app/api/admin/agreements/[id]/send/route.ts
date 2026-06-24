import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { loadAgreement } from '@/lib/agreements';
import { sendSignatureRequestEmail } from '@/lib/services/email';

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');

// POST /api/admin/agreements/:id/send — email each pending signer their link
// body (optional): { signerIds?: string[] } to (re)send a subset
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const agreement = await loadAgreement(sb, params.id);
  if (!agreement) return fail('Agreement not found', 404);
  if (agreement.status === 'completed') return fail('Agreement is already fully signed', 409);

  const body = await req.json().catch(() => ({}));
  const only: string[] | undefined = Array.isArray(body?.signerIds) ? body.signerIds : undefined;

  const base = siteUrl();
  const targets = (agreement.signers ?? [])
    .filter((s) => s.status !== 'signed')
    .filter((s) => (only ? only.includes(s.id) : true));

  const results = await Promise.allSettled(
    targets.map((s) =>
      sendSignatureRequestEmail(s.email, s.name, agreement.title, `${base}/sign/${s.token}`)
    )
  );
  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  // Move out of draft once requests go out (keep partially_signed if some already signed).
  const anySigned = (agreement.signers ?? []).some((s) => s.status === 'signed');
  const newStatus = anySigned ? 'partially_signed' : 'sent';
  if (agreement.status !== newStatus) {
    await sb.from('agreements').update({ status: newStatus }).eq('id', params.id);
  }

  const { data } = await sb.from('agreements').select('*, signers:agreement_signers(*)').eq('id', params.id).maybeSingle();
  return ok({ sent, failed, agreement: toCamel(data) });
});

export const dynamic = 'force-dynamic';
