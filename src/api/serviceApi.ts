import axiosInstance from './axiosInstance';

export interface Service {
  _id: string;
  title: string;
  slug: string;
  description: string;
  duration: number;
  price: number;
  isFree: boolean;
  isActive: boolean;
  order: number;
}

export const getServices = (all = false) =>
  axiosInstance.get<{ success: boolean; services: Service[] }>(`/services${all ? '?all=true' : ''}`);

export const createService = (data: Partial<Service>) =>
  axiosInstance.post('/services', data);

export const updateService = (id: string, data: Partial<Service>) =>
  axiosInstance.put(`/services/${id}`, data);

export const deleteService = (id: string) =>
  axiosInstance.delete(`/services/${id}`);
