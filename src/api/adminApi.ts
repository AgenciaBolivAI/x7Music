import api from './axiosInstance';

export interface DashboardStats {
  totalClients: number;
  newClientsThisMonth: number;
  newClientsLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueAllTime: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  pendingBookings: number;
  unreadMessages: number;
  upcomingEventsCount: number;
  activeSubscribers: number;
  publishedArtists: number;
  publishedReleases: number;
  blogPosts: number;
  catalogEntries: number;
  agreementsPending: number;
  agreementsCompleted: number;
}

export interface DashboardSeries {
  labels: string[];
  revenue: number[];
  bookings: number[];
  clients: number[];
}

export interface DashboardBreakdown {
  bookingStatus: Record<string, number>;
  agreementStatus: Record<string, number>;
}

export interface RecentMessage { _id: string; name: string; subject: string; status: string; createdAt: string }
export interface RecentSignup { firstName: string; lastName: string; email: string; createdAt: string }

export interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
  series: DashboardSeries;
  breakdown: DashboardBreakdown;
  recentBookings: unknown[];
  recentMessages: RecentMessage[];
  recentSignups: RecentSignup[];
  generatedAt: string;
}

export interface AdminClient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  avatarUrl?: string;
  isActive: boolean;
  stripeCustomerId?: string;
  createdAt: string;
}

export const getDashboardStats = () => api.get<DashboardResponse>('/admin/stats');

export const getClients = (params?: { search?: string; page?: number; limit?: number }) =>
  api.get<{ success: boolean; clients: AdminClient[]; total: number }>('/admin/clients', { params });

export const getClientDetail = (id: string) =>
  api.get<{ success: boolean; client: AdminClient; bookings: unknown[]; catalogCount: number; docCount: number }>(
    `/admin/clients/${id}`
  );

export const updateClient = (id: string, data: Partial<AdminClient>) =>
  api.put(`/admin/clients/${id}`, data);
