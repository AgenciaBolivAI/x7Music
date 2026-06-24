import api from './axiosInstance';

export interface Document {
  _id: string;
  client: { _id: string; firstName: string; lastName: string; email: string } | string;
  booking?: string;
  title: string;
  type: 'invoice' | 'contract' | 'report' | 'receipt' | 'other';
  fileUrl?: string; // not returned by list endpoints; downloads go through the authed proxy
  fileSize?: number;
  uploadedBy: 'admin' | 'client';
  createdAt: string;
}

export const getMyDocuments = () =>
  api.get<{ success: boolean; documents: Document[] }>('/documents/my');

export const getAllDocuments = (clientId?: string) =>
  api.get<{ success: boolean; documents: Document[] }>('/documents', {
    params: clientId ? { clientId } : {},
  });

export const uploadDocument = (data: FormData) =>
  api.post('/documents/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

// Downloads via the authenticated proxy (sends the JWT header), then saves the blob.
export const downloadDocument = async (id: string, title: string) => {
  const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title || 'document').replace(/[^a-z0-9.\-_ ]/gi, '_');
  a.click();
  URL.revokeObjectURL(url);
};
