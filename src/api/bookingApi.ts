import axiosInstance from './axiosInstance';

export interface Booking {
  _id: string;
  client: { _id: string; firstName: string; lastName: string; email: string; company?: string } | string;
  service: { _id: string; title: string; duration: number; price: number; isFree: boolean } | string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  adminNotes: string;
  totalAmount: number;
  paymentStatus: 'unpaid' | 'paid' | 'waived';
  stripeCheckoutSessionId?: string;
  invoiceId?: string;
  createdAt: string;
}

export const createBooking = (data: {
  serviceId: string;
  scheduledAt: string;
  notes?: string;
}) => axiosInstance.post<{
  success: boolean;
  booking: Booking;
  checkoutUrl: string | null;
  sessionId?: string;
}>('/bookings', data);

export const getMyBookings = () =>
  axiosInstance.get<{ success: boolean; bookings: Booking[] }>('/bookings/my');

export const getAllBookings = (params?: Record<string, string>) =>
  axiosInstance.get<{ success: boolean; bookings: Booking[]; total: number }>('/bookings', { params });

export const getBookingById = (id: string) =>
  axiosInstance.get<{ success: boolean; booking: Booking }>(`/bookings/${id}`);

export const updateBookingStatus = (id: string, status: string) =>
  axiosInstance.put(`/bookings/${id}/status`, { status });

export const updateAdminNotes = (id: string, adminNotes: string) =>
  axiosInstance.put(`/bookings/${id}/admin-notes`, { adminNotes });

export const getSessionStatus = (sessionId: string) =>
  axiosInstance.get<{ success: boolean; paymentStatus: string; booking: Booking }>(
    `/payments/session/${sessionId}`
  );
