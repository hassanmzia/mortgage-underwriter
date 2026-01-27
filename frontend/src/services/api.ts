import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors with automatic token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      // No refresh token available, logout
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post('/api/auth/token/refresh/', {
          refresh: refreshToken,
        });
        const newToken = response.data.access;
        const newRefresh = response.data.refresh || refreshToken;

        useAuthStore.getState().setToken(newToken);
        if (response.data.refresh) {
          useAuthStore.setState({ refreshToken: newRefresh });
        }

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await axios.post('/api/auth/token/', {
      username,
      password,
    });
    return response.data;
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    const response = await axios.post('/api/v1/users/register/', data);
    return response.data;
  },

  refreshToken: async (refresh: string) => {
    const response = await axios.post('/api/auth/token/refresh/', {
      refresh,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/users/me/');
    return response.data;
  },
};

// Applications API
export const applicationsAPI = {
  list: async (params?: any) => {
    const response = await api.get('/applications/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/applications/${id}/`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/applications/', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/applications/${id}/`, data);
    return response.data;
  },

  submit: async (id: string) => {
    const response = await api.post(`/applications/${id}/submit/`);
    return response.data;
  },

  assignUnderwriter: async (id: string, underwriterId: string) => {
    const response = await api.post(`/applications/${id}/assign_underwriter/`, {
      underwriter_id: underwriterId,
    });
    return response.data;
  },

  humanReview: async (id: string, decision: string, comments: string) => {
    const response = await api.post(`/applications/${id}/human_review/`, {
      decision,
      comments,
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/applications/summary/');
    return response.data;
  },
};

// Underwriting API
export const underwritingAPI = {
  listWorkflows: async (params?: any) => {
    const response = await api.get('/underwriting/workflows/', { params });
    return response.data;
  },

  getWorkflow: async (id: string) => {
    const response = await api.get(`/underwriting/workflows/${id}/`);
    return response.data;
  },

  startWorkflow: async (id: string) => {
    const response = await api.post(`/underwriting/workflows/${id}/start/`);
    return response.data;
  },

  cancelWorkflow: async (id: string) => {
    const response = await api.post(`/underwriting/workflows/${id}/cancel/`);
    return response.data;
  },

  humanReview: async (id: string, data: any) => {
    const response = await api.post(`/underwriting/workflows/${id}/human_review/`, data);
    return response.data;
  },

  getReasoningChain: async (id: string) => {
    const response = await api.get(`/underwriting/workflows/${id}/reasoning_chain/`);
    return response.data;
  },

  getMetrics: async () => {
    const response = await api.get('/underwriting/workflows/metrics/');
    return response.data;
  },
};

// Compliance API
export const complianceAPI = {
  listBiasFlags: async (params?: any) => {
    const response = await api.get('/compliance/bias-flags/', { params });
    return response.data;
  },

  resolveBiasFlag: async (id: string, notes: string) => {
    const response = await api.post(`/compliance/bias-flags/${id}/resolve/`, {
      resolution_notes: notes,
    });
    return response.data;
  },

  getBiasSummary: async () => {
    const response = await api.get('/compliance/bias-flags/summary/');
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/compliance/dashboard/');
    return response.data;
  },
};

// Agents API
export const agentsAPI = {
  listConfigurations: async () => {
    const response = await api.get('/agents/configurations/');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/agents/configurations/status/');
    return response.data;
  },

  getMetricsSummary: async () => {
    const response = await api.get('/agents/metrics/summary/');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  list: async (params?: any) => {
    const response = await api.get('/users/', { params });
    return response.data;
  },

  getAvailableUnderwriters: async () => {
    const response = await api.get('/users/available_underwriters/');
    return response.data;
  },
};

export default api;
