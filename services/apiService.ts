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
    let errorMessage = `API Error ${response.status}`;
    try {
        const jsonError = JSON.parse(errorBody);
        if (jsonError.error) errorMessage = jsonError.error;
    } catch(e) {}
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export const apiService = {
  // Auth
  login: (email, password) => fetchJson<{token: string, user: User}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' }
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
  getContracts: (search?: string, sort?: string, order?: 'asc'|'desc') => {
      let query = '/contracts';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (sort) params.append('sort', sort);
      if (order) params.append('order', order);
      if (params.toString()) query += `?${params.toString()}`;
      
      return fetchJson<Contract[]>(query);
  },
  
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

  // Export
  getExportUrl: () => {
      const token = localStorage.getItem('token');
      // Returns a URL that can be used in an <a> tag
      // Since it's a GET request, we can't easily set headers in a standard link without a proxy or signed URL.
      // For this app, we will use fetch + blob to download securely.
      return `${API_BASE_URL}/contracts/export/csv`;
  },
  
  downloadExport: async () => {
      const response = await fetch(`${API_BASE_URL}/contracts/export/csv`, {
          headers: getHeaders()
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracts_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
  },

  // Files & Details
  uploadAttachment: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      return fetch(`${API_BASE_URL}/contracts/${id}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
      }).then(r => r.json());
  },
  getAttachments: (id: number) => fetchJson<Attachment[]>(`/contracts/${id}/attachments`),
  getAuditLogs: (id: number) => fetchJson<AuditLog[]>(`/contracts/${id}/audit`),

  // AI Extraction (Robust)
  extractContractData: (text: string, file?: File) => {
      // Logic: if file exists, use multipart. If text only, use JSON.
      const token = localStorage.getItem('token');
      
      if (file) {
          const formData = new FormData();
          formData.append('file', file);
          if (text) formData.append('text', text); // Optional hint text
          
          return fetch(`${API_BASE_URL}/contracts/extract`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
          }).then(async r => {
              const res = await r.json();
              if (!r.ok || !res.success) throw new Error(res.error || "AI Extraction failed");
              return res; // returns contract data object directly in res (or res.data if structured)
          });
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