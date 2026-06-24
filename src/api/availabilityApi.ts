import axiosInstance from './axiosInstance';

export interface ScheduleEntry {
  _id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBlocked: boolean;
  bufferMinutes: number;
}

export interface DateBlock {
  _id: string;
  specificDate: string;
  isBlocked: boolean;
}

export const getSlots = (date: string, serviceId: string) =>
  axiosInstance.get<{ success: boolean; slots: string[] }>(`/availability/slots?date=${date}&serviceId=${serviceId}`);

export const getCalendarMonth = (year: number, month: number, serviceId: string) =>
  axiosInstance.get<{ success: boolean; availableDates: string[] }>(
    `/availability/calendar?year=${year}&month=${month}&serviceId=${serviceId}`
  );

export const getSchedule = () =>
  axiosInstance.get<{ success: boolean; schedules: ScheduleEntry[]; blocks: DateBlock[] }>('/availability/schedule');

export const saveSchedule = (entries: ScheduleEntry[]) =>
  axiosInstance.post('/availability/schedule', { entries });

export const blockDate = (date: string) =>
  axiosInstance.post('/availability/block', { date });

export const unblockDate = (id: string) =>
  axiosInstance.delete(`/availability/block/${id}`);
