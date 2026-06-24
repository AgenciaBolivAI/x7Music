import api from './axiosInstance';

export type WriterRole = 'writer' | 'composer' | 'producer' | 'publisher' | 'other';

export interface SplitWriter {
  artist?: string;
  name: string;
  role: WriterRole;
  pro?: string;
  ipi?: string;
  publisher?: string;
  percentage: number;
}

export interface SplitSheet {
  _id: string;
  songTitle: string;
  workDate?: string;
  notes?: string;
  writers: SplitWriter[];
  createdAt: string;
}

export interface SplitSheetInput {
  songTitle: string;
  workDate?: string;
  notes?: string;
  writers: SplitWriter[];
}

export const getSplitSheets = () =>
  api.get<{ success: boolean; splitSheets: SplitSheet[] }>('/split-sheets');

export const createSplitSheet = (data: SplitSheetInput) =>
  api.post<{ success: boolean; splitSheet: SplitSheet }>('/split-sheets', data);

export const deleteSplitSheet = (id: string) => api.delete(`/split-sheets/${id}`);

// Fetches the PDF with the JWT auth header attached, then triggers a download.
export const downloadSplitSheetPdf = async (id: string, songTitle: string) => {
  const res = await api.get(`/split-sheets/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${songTitle.replace(/[^a-z0-9]+/gi, '-')}-split-sheet.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
