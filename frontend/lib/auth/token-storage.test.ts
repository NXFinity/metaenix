import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenStorage, migrateLegacyTokens } from './token-storage';

describe('TokenStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset environment variable
    vi.stubEnv('NEXT_PUBLIC_USE_HTTPONLY_COOKIES', 'false');
  });

  describe('LocalStorageTokenStorage', () => {
    it('should store and retrieve access token', () => {
      const token = 'test-access-token';
      tokenStorage.setAccessToken(token);
      expect(tokenStorage.getAccessToken()).toBe(token);
    });

    it('should store and retrieve refresh token', () => {
      const token = 'test-refresh-token';
      tokenStorage.setRefreshToken(token);
      expect(tokenStorage.getRefreshToken()).toBe(token);
    });

    it('should clear all tokens', () => {
      tokenStorage.setAccessToken('token1');
      tokenStorage.setRefreshToken('token2');
      tokenStorage.clearTokens();
      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });

    it('should check if tokens exist', () => {
      expect(tokenStorage.hasTokens()).toBe(false);
      tokenStorage.setAccessToken('token');
      expect(tokenStorage.hasTokens()).toBe(true);
    });

    it('should obfuscate tokens in localStorage', () => {
      const token = 'test-token';
      tokenStorage.setAccessToken(token);
      
      // Token should be obfuscated (base64 encoded) in localStorage
      const stored = localStorage.getItem('at');
      expect(stored).not.toBe(token);
      expect(stored).toBeTruthy();
      
      // But should be readable via getAccessToken
      expect(tokenStorage.getAccessToken()).toBe(token);
    });

    it('should handle invalid obfuscated tokens gracefully', () => {
      // Set invalid obfuscated token
      localStorage.setItem('at', 'invalid-base64');
      
      // Should clear corrupted token and return null
      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(localStorage.getItem('at')).toBeNull();
    });
  });

  describe('migrateLegacyTokens', () => {
    it('should migrate legacy tokens to new storage', () => {
      const accessToken = 'legacy-access-token';
      const refreshToken = 'legacy-refresh-token';
      
      // Set legacy tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Migrate
      migrateLegacyTokens();
      
      // Check new storage has tokens
      expect(tokenStorage.getAccessToken()).toBe(accessToken);
      expect(tokenStorage.getRefreshToken()).toBe(refreshToken);
      
      // Check legacy tokens are removed
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('should not fail if no legacy tokens exist', () => {
      expect(() => migrateLegacyTokens()).not.toThrow();
    });
  });
});

