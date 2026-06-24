import api from './axiosInstance';

export interface Message {
  _id: string;
  senderName: string;
  senderEmail: string;
  client?: { _id: string; firstName: string; lastName: string };
  subject: string;
  body: string;
  status: 'unread' | 'read' | 'replied';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export const submitMessage = (data: {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
}) => api.post('/messages', data);

export const getAllMessages = () => api.get<{ success: boolean; messages: Message[]; unreadCount: number }>('/messages');

export const getUnreadCount = () => api.get<{ success: boolean; count: number }>('/messages/unread-count');

export const markRead = (id: string) => api.put(`/messages/${id}/read`);

export const replyMessage = (id: string, reply: string) =>
  api.put(`/messages/${id}/reply`, { replyText: reply });

export const deleteMessage = (id: string) => api.delete(`/messages/${id}`);
