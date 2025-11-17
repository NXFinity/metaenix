import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not defined. Please add it to your .env.local file.'
  );
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: false, // JWT auth doesn't need cookies
});

// Add Bearer token for authenticated requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export { apiClient };
export default apiClient;
