import api from './axiosInstance';

export interface Resource {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  // admin-only fields:
  fileUrl?: string;
  isActive?: boolean;
  downloadCount?: number;
  createdAt?: string;
}

// Public
export const getResources = () =>
  api.get<{ success: boolean; resources: Resource[] }>('/resources');

export const requestResource = (data: { name: string; email: string; slug: string; language?: 'en' | 'es' }) =>
  api.post<{ success: boolean; downloadUrl: string; title: string }>('/resources/request', data);

// Admin
export const getAdminResources = () =>
  api.get<{ success: boolean; resources: Resource[] }>('/admin/resources');

export const createResource = (data: FormData) =>
  api.post('/admin/resources', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const setResourceActive = (id: string, isActive: boolean) =>
  api.patch(`/admin/resources/${id}`, { isActive });

export const deleteResource = (id: string) => api.delete(`/admin/resources/${id}`);
