import { createServiceClient } from '@/lib/supabase/service';
import { fail, handler } from '@/lib/api';
import { rateLimit, tooMany } from '@/lib/rateLimit';
import { loadAgreement, renderAgreementPdf, agreementFilename } from '@/lib/agreements';

// GET /api/sign/:token/pdf — current PDF for the signer to review (token-gated)
export const GET = handler(async (req: Request, { params }: { params: { token: string } }) => {
  const rl = rateLimit(req, 'sign_pdf', 60, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const sb = createServiceClient();
  const { data: signer } = await sb
    .from('agreement_signers')
    .select('agreement_id')
    .eq('token', params.token)
    .maybeSingle();
  if (!signer) return fail('This signing link is invalid or has expired.', 404);

  const agreement = await loadAgreement(sb, signer.agreement_id);
  if (!agreement) return fail('Agreement not found', 404);

  const pdf = await renderAgreementPdf(agreement);
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${agreementFilename(agreement)}"`,
    },
  });
});

export const dynamic = 'force-dynamic';
