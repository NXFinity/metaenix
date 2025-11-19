import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { apiClient } from '@/lib/api/client';
import { AUTH_ENDPOINTS } from './auth.endpoints';

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockResponse = {
        data: {
          message: 'Registration successful',
          user: { id: '123', username: 'testuser' },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        AUTH_ENDPOINTS.REGISTER,
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
      );
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const mockResponse = {
        data: {
          message: 'Login successful',
          user: { id: '123', username: 'testuser' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        AUTH_ENDPOINTS.LOGIN,
        {
          email: 'test@example.com',
          password: 'password123',
        }
      );
    });
  });

  describe('getMe', () => {
    it('should get current user', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

      const result = await authService.getMe();

      expect(result).toEqual(mockUser);
      expect(apiClient.get).toHaveBeenCalledWith(
        AUTH_ENDPOINTS.GET_ME
      );
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockResponse = {
        data: {
          message: 'Logout successful',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.logout();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        AUTH_ENDPOINTS.LOGOUT
      );
    });
  });
});

