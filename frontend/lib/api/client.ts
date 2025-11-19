import axios from 'axios';
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

export { apiClient };
export default apiClient;
