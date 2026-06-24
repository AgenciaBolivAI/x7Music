import api from './axiosInstance';

export interface Event {
  _id: string;
  title: string;
  slug: string;
  type: 'spotlight' | 'worship' | 'pinstage' | 'meeting' | 'other';
  description?: string;
  longDescription?: string;
  date: string;
  endDate?: string;
  location?: string;
  virtualLink?: string;
  imageUrl?: string;
  ticketLink?: string;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
}

export const getEvents = (all = false) =>
  api.get<{ success: boolean; events: Event[] }>('/events', {
    params: all ? { all: 'true' } : {},
  });

export const getPastEvents = () =>
  api.get<{ success: boolean; events: Event[] }>('/events/past');

export const getEventBySlug = (slug: string) =>
  api.get<{ success: boolean; event: Event }>(`/events/${slug}`);

export const createEvent = (data: FormData) =>
  api.post('/events', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateEvent = (id: string, data: FormData) =>
  api.put(`/events/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteEvent = (id: string) => api.delete(`/events/${id}`);
