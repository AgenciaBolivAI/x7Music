import api from './axiosInstance';

export interface Artist {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  bio?: string;
  imageUrl?: string;
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
    amazonMusic?: string;
    tidal?: string;
  };
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
  featuredVideoUrl?: string;
  spotifyEmbedUrl?: string;
  legalName?: string;
  stageName?: string;
  address?: string;
  phone?: string;
  country?: string;
  pro?: string;
  ipiNumber?: string;
  publisherName?: string;
  publisherIpi?: string;
  contactEmail?: string;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  createdAt: string;
}

export const getArtists = (all = false) =>
  api.get<{ success: boolean; artists: Artist[] }>('/artists', {
    params: all ? { all: 'true' } : {},
  });

export const getFeaturedArtists = () =>
  api.get<{ success: boolean; artists: Artist[] }>('/artists/featured');

export const getArtistBySlug = (slug: string) =>
  api.get<{ success: boolean; artist: Artist }>(`/artists/slug/${slug}`);

export const createArtist = (data: FormData) =>
  api.post('/artists', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateArtist = (id: string, data: FormData) =>
  api.put(`/artists/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteArtist = (id: string) => api.delete(`/artists/${id}`);
