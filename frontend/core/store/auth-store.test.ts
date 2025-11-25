import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from './auth-store';
import type { User } from '@/core/api/users/user';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should initialize with null user and false isAuthenticated', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user and update isAuthenticated', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser: User = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
    } as User;

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should logout and clear user', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser: User = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
    } as User;

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set isAuthenticated to false when user is null', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});

