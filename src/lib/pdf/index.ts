import type { SignerInfo } from './shared';
import { buildSplitSheetPdf, type SplitSheetData } from './splitSheet';
import { buildDistributionAgreementPdf, type DistributionData } from './distributionAgreement';

export type AgreementType = 'split_sheet' | 'distribution_agreement';
export type { SignerInfo, SplitSheetData, DistributionData };
export { buildSplitSheetPdf, buildDistributionAgreementPdf };

/** Human label per agreement type (for emails / UI / filenames). */
export const AGREEMENT_LABELS: Record<AgreementType, string> = {
  split_sheet: 'Split Sheet',
  distribution_agreement: 'Acuerdo de Distribución',
};

/**
 * Build the PDF bytes for an agreement of the given type. `data` is the
 * type-specific payload stored on agreements.data; `signers` are the
 * agreement_signers (with any captured signatures) to render in the blocks.
 */
export async function buildAgreementPdf(
  type: AgreementType,
  data: unknown,
  signers: SignerInfo[] = [],
): Promise<Uint8Array> {
  switch (type) {
    case 'split_sheet':
      return buildSplitSheetPdf(data as SplitSheetData, signers);
    case 'distribution_agreement':
      return buildDistributionAgreementPdf(data as DistributionData, signers);
    default:
      throw new Error(`Unknown agreement type: ${type}`);
  }
}
