import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './client';
import { tokenStorage } from '@/lib/auth/token-storage';

// Mock token storage
vi.mock('@/lib/auth/token-storage', () => ({
  tokenStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
  },
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_USE_HTTPONLY_COOKIES', 'false');
  });

  it('should have correct base URL', () => {
    expect(apiClient.defaults.baseURL).toBe(process.env.NEXT_PUBLIC_API_URL);
  });

  it('should have withCredentials enabled', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('should add Authorization header when token exists and cookies disabled', () => {
    const mockToken = 'test-access-token';
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(mockToken);
    vi.stubEnv('NEXT_PUBLIC_USE_HTTPONLY_COOKIES', 'false');

    const config = apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as any);

    expect(config.headers.Authorization).toBe(`Bearer ${mockToken}`);
  });

  it('should not add Authorization header when using cookies', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_HTTPONLY_COOKIES', 'true');

    const config = apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('should not add Authorization header when no token exists', () => {
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
    vi.stubEnv('NEXT_PUBLIC_USE_HTTPONLY_COOKIES', 'false');

    const config = apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });
});

