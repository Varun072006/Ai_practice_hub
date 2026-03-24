/// <reference types="vite/client" />
import axios from 'axios';
import API_BASE_URL from '../config/api';

const api = axios.create({
  // Ensure baseURL ends with a slash so that relative paths append correctly
  baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV) {
      console.log('API Request:', config.url, 'with token:', token.substring(0, 20) + '...');
    }
  } else if (import.meta.env.DEV) {
    console.warn('API Request without token:', config.url);
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Get the requested URL
      const requestedUrl = error.config?.url || '';

      // Clear invalid token and redirect to login (except for auth endpoints)
      if (!requestedUrl.includes('/auth/login') && !requestedUrl.includes('/auth/google')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const basePath = import.meta.env.BASE_URL || '/';
        const loginPath = basePath.endsWith('/') ? basePath + 'login' : basePath + '/login';
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = loginPath;
        }
      }

      if (import.meta.env.DEV) {
        console.error('401 Unauthorized - Token cleared and redirecting to login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
