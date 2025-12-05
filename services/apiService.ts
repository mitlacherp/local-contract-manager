import { API_BASE_URL } from '../constants';
import { Contract, Alert, DashboardStats, User, Attachment, AuditLog } from '../types';

const getHeaders = (isMultipart = false) => {
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    return headers;
};

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers }
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  return response.json();
}

export const apiService = {
  // Auth
  login: (email, password) => fetchJson<{token: string, user: User}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' } // No auth header needed
  }),
  forgotPassword: (email) => fetchJson('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
  }),

  // Admin
  getUsers: () => fetchJson<User[]>('/users'),
  createUser: (data) => fetchJson('/users', { method: 'POST', body: JSON.stringify(data) }),
  getSettings: () => fetchJson<any>('/settings'),
  saveSetting: (key, value) => fetchJson('/settings', { method: 'POST', body: JSON.stringify({key, value}) }),

  // Contracts
  getContracts: () => fetchJson<Contract[]>('/contracts'),
  getContract: (id: number) => fetchJson<Contract>(`/contracts/${id}`),
  createContract: (data: Contract) => fetchJson<{id: number, message: string}>('/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateContract: (id: number, data: Contract) => fetchJson<{message: string}>(`/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteContract: (id: number) => fetchJson<{message: string}>(`/contracts/${id}`, {
    method: 'DELETE',
  }),

  // Files & Details
  uploadAttachment: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // Special fetch because fetchJson sets Content-Type to json, but we need multipart (browser sets boundary)
      const token = localStorage.getItem('token');
      return fetch(`${API_BASE_URL}/contracts/${id}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
      }).then(r => r.json());
  },
  getAttachments: (id: number) => fetchJson<Attachment[]>(`/contracts/${id}/attachments`),
  getAuditLogs: (id: number) => fetchJson<AuditLog[]>(`/contracts/${id}/audit`),

  // AI Extraction (Text or File)
  extractContractData: (text: string, file?: File) => {
      if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const token = localStorage.getItem('token');
          return fetch(`${API_BASE_URL}/contracts/extract`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
          }).then(r => r.json());
      } else {
        return fetchJson<Partial<Contract>>('/contracts/extract', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
      }
  },

  // Alerts & Dashboard
  getAlerts: () => fetchJson<Alert[]>('/alerts'),
  markAlertRead: (id: number) => fetchJson<{message: string}>(`/alerts/${id}/read`, {
    method: 'PUT',
  }),
  getDashboardStats: () => fetchJson<DashboardStats>('/dashboard/stats'),
};