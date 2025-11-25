import axios, { AxiosError } from 'axios';
import { tokenStorage } from '@/lib/auth/token-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not defined. Please add it to your .env.local file.'
  );
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enable cookies for httpOnly cookie support
});

// Add Bearer token for authenticated requests (fallback for non-cookie auth)
// If httpOnly cookies are enabled, tokens are automatically sent by browser
apiClient.interceptors.request.use((config) => {
  // Check if using cookies (tokens sent automatically)
  const useCookies = process.env.NEXT_PUBLIC_USE_HTTPONLY_COOKIES === 'true';
  
  if (!useCookies) {
    // Fallback to Bearer token from storage (legacy behavior)
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // If using cookies, Authorization header not needed (tokens in cookies)
  
  return config;
});

// Handle 401 Unauthorized errors globally - token invalidated or expired
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - token invalidated, expired, or session terminated
    if (error.response?.status === 401) {
      // Clear tokens immediately - this will be handled by useAuth hook
      // Don't redirect here - let React Query and useAuth handle it
      // to avoid conflicts with logout flow
      tokenStorage.clearTokens();
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
