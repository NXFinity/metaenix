import axios, { AxiosError } from 'axios';
import { adminTokenStorage } from '@/lib/auth/token-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not defined. Please add it to your .env.local file.'
  );
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  // Admin client uses admin session tokens
  const adminToken = adminTokenStorage.getAdminSessionToken();
  
  if (adminToken && adminTokenStorage.isAdminSessionValid()) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - admin session invalidated or expired
    // Don't redirect if this is the exchange endpoint (let the page handle the error)
    const isExchangeEndpoint = error.config?.url?.includes('/auth/admin/session/exchange');
    
    if (error.response?.status === 401 && !isExchangeEndpoint) {
      adminTokenStorage.clearAdminSession();
      // Redirect to login or show error
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;

