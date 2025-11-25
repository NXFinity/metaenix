'use client';

import { useState, useEffect } from 'react';
import { adminTokenStorage } from '@/lib/auth/token-storage';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        setIsInitializing(false);
        return;
      }

      try {
        // Check for admin session using token storage
        if (adminTokenStorage.isAdminSessionValid()) {
          const adminUser = adminTokenStorage.getAdminUser();
          if (adminUser) {
            setUser(adminUser);
          } else {
            setUser(null);
          }
        } else {
          // Token expired or invalid, clear storage
          adminTokenStorage.clearAdminSession();
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  return {
    user,
    isAuthenticated: !!user && adminTokenStorage.isAdminSessionValid(),
    isInitializing,
  };
}

