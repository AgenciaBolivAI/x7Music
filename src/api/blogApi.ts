import api from './axiosInstance';

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  author: string;
  tags?: string[];
  category?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

export const getPosts = (all = false) =>
  api.get<{ success: boolean; posts: BlogPost[] }>('/blog', {
    params: all ? { all: 'true' } : {},
  });

export const getPostBySlug = (slug: string, preview = false) =>
  api.get<{ success: boolean; post: BlogPost }>(`/blog/${slug}`, {
    params: preview ? { preview: 'true' } : {},
  });

export const createPost = (data: FormData) =>
  api.post('/blog', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updatePost = (id: string, data: FormData) =>
  api.put(`/blog/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deletePost = (id: string) => api.delete(`/blog/${id}`);
