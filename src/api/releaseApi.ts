import api from './axiosInstance';

export interface Release {
  _id: string;
  title: string;
  artist: string;
  type: 'single' | 'ep' | 'album';
  releaseDate: string;
  coverArtUrl?: string;
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
    amazonMusic?: string;
    tidal?: string;
  };
  description?: string;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
}

export const getReleases = (all = false) =>
  api.get<{ success: boolean; releases: Release[] }>('/releases', {
    params: all ? { all: 'true' } : {},
  });

export const getFeaturedReleases = () =>
  api.get<{ success: boolean; releases: Release[] }>('/releases/featured');

export const getReleaseById = (id: string) =>
  api.get<{ success: boolean; release: Release }>(`/releases/${id}`);

export const createRelease = (data: FormData) =>
  api.post('/releases', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateRelease = (id: string, data: FormData) =>
  api.put(`/releases/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteRelease = (id: string) => api.delete(`/releases/${id}`);
