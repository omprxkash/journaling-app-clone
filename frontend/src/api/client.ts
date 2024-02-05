import axios from 'axios';
import type { Entry, Tag, Stats, PaginatedEntries } from '../types/journal';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
});

export interface RegisterPayload { email: string; password: string; }
export interface LoginPayload { email: string; password: string; }
export interface EntryPayload {
  title: string;
  body: string;
  tags?: string[];
  mood?: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ user: { id: string; email: string } }>('/auth/register', data),
  login: (data: LoginPayload) =>
    api.post<{ user: { id: string; email: string } }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

export const entriesApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedEntries>('/entries', { params }),
  get: (id: string) => api.get<{ entry: Entry }>(`/entries/${id}`),
  create: (data: EntryPayload) => api.post<{ entry: Entry }>('/entries', data),
  update: (id: string, data: EntryPayload) =>
    api.put<{ entry: Entry }>(`/entries/${id}`, data),
  delete: (id: string) => api.delete(`/entries/${id}`),
  stats: () => api.get<Stats>('/entries/stats'),
};

export const tagsApi = {
  list: () => api.get<{ tags: Tag[] }>('/tags'),
  create: (data: { name: string; color?: string }) =>
    api.post<{ tag: Tag }>('/tags', data),
};
