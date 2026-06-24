import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { buildAgreementPdf, buildTemplatePdf, type AgreementType, type SignerInfo } from '@/lib/pdf';

/** Raw agreement_signers row (snake_case from Supabase). */
export interface DbSigner {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  address: string | null;
  sort_order: number;
  status: 'pending' | 'viewed' | 'signed';
  signature_data: string | null;
  signed_name: string | null;
  signed_at: string | null;
  token?: string;
}

export interface DbAgreement {
  id: string;
  type: AgreementType;
  title: string;
  status: string;
  data: Record<string, unknown>;
  body?: string | null;
  template_id?: string | null;
  signers?: DbSigner[];
}

/** Map signer rows → the SignerInfo the PDF builder renders (sorted by slot). */
export function signersToPdf(signers: DbSigner[] = []): SignerInfo[] {
  return [...signers]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      name: s.name,
      email: s.email,
      role: s.role,
      phone: s.phone,
      address: s.address,
      signatureData: s.signature_data,
      signedName: s.signed_name,
      signedAt: s.signed_at,
    }));
}

/** Load an agreement with its signers (single round-trip). Returns null if missing. */
export async function loadAgreement(sb: SupabaseClient, id: string): Promise<DbAgreement | null> {
  const { data, error } = await sb
    .from('agreements')
    .select('*, signers:agreement_signers(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbAgreement) ?? null;
}

/** Generate the PDF bytes for an agreement. Uses the frozen template body when
 * present (the editable-template path); falls back to the legacy built-in layout
 * for older agreements created before templates existed. */
export function renderAgreementPdf(agreement: DbAgreement): Promise<Uint8Array> {
  const signers = signersToPdf(agreement.signers ?? []);
  if (agreement.body && agreement.body.trim()) {
    return buildTemplatePdf(agreement.body, agreement.data, signers);
  }
  return buildAgreementPdf(agreement.type, agreement.data, signers);
}

/** Safe filename for a downloaded/attached agreement PDF. */
export function agreementFilename(agreement: { title: string; type: AgreementType }): string {
  const slug = (agreement.title || agreement.type).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${slug || 'agreement'}.pdf`;
}

// ── Validation ────────────────────────────────────────────────────────────────
export const signerInputSchema = z.object({
  artistId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.string().max(60).optional(),
  phone: z.string().max(60).optional(),
  address: z.string().max(300).optional(),
});

export const agreementCreateSchema = z.object({
  type: z.enum(['split_sheet', 'distribution_agreement']),
  templateId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  data: z.record(z.unknown()).default({}),
  signers: z.array(signerInputSchema).min(1).max(20),
});

export const agreementUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: z.record(z.unknown()).optional(),
  signers: z.array(signerInputSchema).min(1).max(20).optional(),
});
