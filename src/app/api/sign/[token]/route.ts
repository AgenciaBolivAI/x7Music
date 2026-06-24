import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { rateLimit, tooMany } from '@/lib/rateLimit';
import { loadAgreement, renderAgreementPdf, agreementFilename, type DbSigner } from '@/lib/agreements';
import { sendAgreementCompletedEmail } from '@/lib/services/email';

const signSchema = z.object({
  signatureData: z.string().min(50),
  signedName: z.string().min(1).max(200),
});

// GET /api/sign/:token — fetch the document + this signer's slot; mark viewed.
export const GET = handler(async (req: Request, { params }: { params: { token: string } }) => {
  const rl = rateLimit(req, 'sign_view', 60, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const sb = createServiceClient();
  const { data: signer } = await sb
    .from('agreement_signers')
    .select('*, agreement:agreements(id, type, title, data, status)')
    .eq('token', params.token)
    .maybeSingle();
  if (!signer || !signer.agreement) return fail('This signing link is invalid or has expired.', 404);

  if (signer.status === 'pending') {
    await sb.from('agreement_signers')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', signer.id);
  }

  // Other signers (names + status only — never expose tokens/signatures).
  const { data: others } = await sb
    .from('agreement_signers')
    .select('name, role, status, sort_order')
    .eq('agreement_id', signer.agreement.id)
    .order('sort_order', { ascending: true });

  return ok({
    agreement: {
      type: signer.agreement.type,
      title: signer.agreement.title,
      status: signer.agreement.status,
    },
    signer: {
      name: signer.name,
      email: signer.email,
      role: signer.role,
      status: signer.status === 'pending' ? 'viewed' : signer.status,
      signedAt: signer.signed_at,
    },
    signers: others ?? [],
  });
});

// POST /api/sign/:token — submit the captured signature.
export const POST = handler(async (req: Request, { params }: { params: { token: string } }) => {
  const rl = rateLimit(req, 'sign_submit', 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const body = await req.json().catch(() => ({}));
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const { signatureData, signedName } = parsed.data;
  if (!/^data:image\/png;base64,/.test(signatureData) || signatureData.length > 900_000) {
    return fail('Invalid signature image.', 400);
  }

  const sb = createServiceClient();
  const { data: signer } = await sb
    .from('agreement_signers')
    .select('id, agreement_id, status')
    .eq('token', params.token)
    .maybeSingle();
  if (!signer) return fail('This signing link is invalid or has expired.', 404);
  if (signer.status === 'signed') return ok({ alreadySigned: true, status: 'signed' });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip') || null;
  const ua = req.headers.get('user-agent') || null;

  const { error: upErr } = await sb.from('agreement_signers').update({
    status: 'signed',
    signature_data: signatureData,
    signed_name: signedName,
    signed_at: new Date().toISOString(),
    signer_ip: ip,
    signer_user_agent: ua,
  }).eq('id', signer.id);
  if (upErr) return fail(upErr.message, 400);

  // Recompute agreement status; finalize when everyone has signed.
  const agreement = await loadAgreement(sb, signer.agreement_id);
  const signers = (agreement?.signers ?? []) as DbSigner[];
  const allSigned = signers.length > 0 && signers.every((s) => s.status === 'signed');

  await sb.from('agreements')
    .update({ status: allSigned ? 'completed' : 'partially_signed' })
    .eq('id', signer.agreement_id);

  if (allSigned && agreement) {
    agreement.status = 'completed';
    try {
      const pdf = await renderAgreementPdf(agreement);
      const filename = agreementFilename(agreement);
      const recipients = new Set<string>();
      if (process.env.SMTP_USER) recipients.add(process.env.SMTP_USER);
      signers.forEach((s) => s.email && recipients.add(s.email));
      await Promise.allSettled(
        [...recipients].map((to) =>
          sendAgreementCompletedEmail(to, '', agreement.title, pdf, filename)
        )
      );
    } catch (e) {
      console.error('[agreement complete] delivery failed', e);
    }
  }

  return ok({ status: 'signed', allSigned });
});

export const dynamic = 'force-dynamic';
