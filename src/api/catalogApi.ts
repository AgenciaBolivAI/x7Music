import api from './axiosInstance';

export interface CatalogEntry {
  _id: string;
  client: { _id: string; firstName: string; lastName: string; email: string } | string;
  title: string;
  type: 'song' | 'album' | 'ep' | 'single';
  isrc?: string;
  iswc?: string;
  upc?: string;
  registeredPRO?: string;
  registeredMLC?: boolean;
  distributionPlatforms?: string[];
  releaseDate?: string;
  status: 'pending' | 'in_progress' | 'registered' | 'issue';
  statusNotes?: string;
  coverArtUrl?: string;
  createdAt: string;
}

export const getMyCatalog = () =>
  api.get<{ success: boolean; entries: CatalogEntry[] }>('/catalog/my');

export const getAllCatalog = (clientId?: string) =>
  api.get<{ success: boolean; entries: CatalogEntry[] }>('/catalog', {
    params: clientId ? { clientId } : {},
  });

export const createEntry = (data: FormData) =>
  api.post('/catalog', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateEntry = (id: string, data: FormData | Record<string, unknown>) => {
  if (data instanceof FormData) {
    return api.put(`/catalog/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.put(`/catalog/${id}`, data);
};

export const deleteEntry = (id: string) => api.delete(`/catalog/${id}`);
