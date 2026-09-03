import axios from 'axios';
import { auth } from './firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Attach Firebase Bearer Token to outgoing requests
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('Failed to retrieve Firebase ID token', err);
      }
    } else {
      // If dev mock token exists in sessionStorage, use it
      const devToken = sessionStorage.getItem('mindvault_dev_token');
      if (devToken) {
        config.headers.Authorization = `Bearer ${devToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
