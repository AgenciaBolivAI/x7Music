import axiosInstance from './axiosInstance';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const registerUser = (data: RegisterData) =>
  axiosInstance.post('/auth/register', data);

export const loginUser = (data: LoginData) =>
  axiosInstance.post('/auth/login', data);

export const getMe = () =>
  axiosInstance.get('/auth/me');

export const updateMe = (data: Partial<RegisterData>) =>
  axiosInstance.put('/auth/me', data);

export const forgotPassword = (email: string) =>
  axiosInstance.post('/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
  axiosInstance.post('/auth/reset-password', { token, password });
