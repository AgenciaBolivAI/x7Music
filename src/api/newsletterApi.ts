import api from './axiosInstance';

export interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  language: 'en' | 'es';
  source: 'footer' | 'contact' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface Campaign {
  _id: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  audience: 'all' | 'en' | 'es';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'sent' | 'partial' | 'failed';
  createdAt: string;
}

export interface BroadcastInput {
  subject: string;
  body: string;
  audience: 'all' | 'en' | 'es';
  ctaLabel?: string;
  ctaUrl?: string;
}

export const subscribeNewsletter = (data: {
  email: string;
  name?: string;
  language?: 'en' | 'es';
  source?: 'footer' | 'contact';
}) => api.post('/newsletter/subscribe', data);

export const getSubscribers = () =>
  api.get<{ success: boolean; subscribers: Subscriber[] }>('/newsletter');

export const deleteSubscriber = (id: string) => api.delete(`/newsletter/${id}`);

// Returns raw CSV — caller turns it into a download
export const exportSubscribers = () =>
  api.get<string>('/newsletter/export', { responseType: 'text' as const });

export const sendBroadcast = (data: BroadcastInput) =>
  api.post<{ success: boolean; campaign: Campaign }>('/newsletter/broadcast', data);

export const getCampaigns = () =>
  api.get<{ success: boolean; campaigns: Campaign[] }>('/newsletter/campaigns');
