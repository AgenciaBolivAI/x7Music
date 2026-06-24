import api from './axiosInstance';

export type AgreementType = 'split_sheet' | 'distribution_agreement';
export type AgreementStatus = 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided';
export type SignerStatus = 'pending' | 'viewed' | 'signed';

export interface AgreementSigner {
  _id: string;
  artistId?: string | null;
  name: string;
  email: string;
  role?: string | null;
  status: SignerStatus;
  token?: string;
  signedAt?: string | null;
  viewedAt?: string | null;
  order: number;
}

export interface Agreement {
  _id: string;
  type: AgreementType;
  title: string;
  status: AgreementStatus;
  data: Record<string, unknown>;
  signers: AgreementSigner[];
  createdAt: string;
  updatedAt: string;
}

export interface SignerInput {
  artistId?: string;
  name: string;
  email: string;
  role?: string;
}

export interface AgreementInput {
  type: AgreementType;
  title: string;
  data: Record<string, unknown>;
  signers: SignerInput[];
}

export const getAgreements = () =>
  api.get<{ success: boolean; agreements: Agreement[] }>('/admin/agreements');

export const getAgreement = (id: string) =>
  api.get<{ success: boolean; agreement: Agreement }>(`/admin/agreements/${id}`);

export const createAgreement = (data: AgreementInput) =>
  api.post<{ success: boolean; agreement: Agreement }>('/admin/agreements', data);

export const updateAgreement = (id: string, data: Partial<AgreementInput>) =>
  api.patch<{ success: boolean; agreement: Agreement }>(`/admin/agreements/${id}`, data);

export const deleteAgreement = (id: string) => api.delete(`/admin/agreements/${id}`);

export const sendAgreement = (id: string, signerIds?: string[]) =>
  api.post<{ success: boolean; sent: number; failed: number; agreement: Agreement }>(
    `/admin/agreements/${id}/send`,
    signerIds ? { signerIds } : {}
  );

/** Fetch the generated PDF (auth cookie attached) and trigger a download. */
export const downloadAgreementPdf = async (id: string, title: string) => {
  const res = await api.get(`/admin/agreements/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '-') || 'agreement'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
