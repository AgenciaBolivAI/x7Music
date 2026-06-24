import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { fail, handler } from '@/lib/api';
import { loadAgreement, renderAgreementPdf, agreementFilename } from '@/lib/agreements';

// GET /api/admin/agreements/:id/pdf — generate the current PDF on demand (admin)
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const agreement = await loadAgreement(sb, params.id);
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
