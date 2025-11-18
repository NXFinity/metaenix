import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { authService } from '@/core/api/auth';
import { useAuthStore } from '@/core/store/auth-store';
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerifyEmailRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyLogin2faRequest,
} from '@/core/api/auth';
import type { User } from '@/core/api/user';

/**
 * Auth Hook Return Type
 */
export interface UseAuthReturn {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoadingUser: boolean;
  userError: Error | null;

  // Auth actions
  register: (data: RegisterRequest) => void;
  registerAsync: (data: RegisterRequest) => Promise<any>;
  isRegistering: boolean;
  registerError: Error | null;

  login: (data: LoginRequest) => void;
  loginAsync: (data: LoginRequest) => Promise<any>;
  isLoggingIn: boolean;
  loginError: Error | null;
  requiresTwoFactor: boolean;

  verifyLogin2fa: (data: { email: string; code: string }) => void;
  verifyLogin2faAsync: (data: { email: string; code: string }) => Promise<any>;
  isVerifying2fa: boolean;
  verify2faError: Error | null;

  logout: () => void;
  logoutAsync: () => Promise<any>;
  isLoggingOut: boolean;

  // Email verification
  verifyEmail: (data: VerifyEmailRequest) => void;
  verifyEmailAsync: (data: VerifyEmailRequest) => Promise<any>;
  isVerifyingEmail: boolean;
  verifyEmailError: Error | null;

  resendVerifyEmail: (data: ResendVerifyEmailRequest) => void;
  resendVerifyEmailAsync: (data: ResendVerifyEmailRequest) => Promise<any>;
  isResendingVerifyEmail: boolean;
  resendVerifyEmailError: Error | null;

  // Password management
  changePassword: (data: ChangePasswordRequest) => void;
  changePasswordAsync: (data: ChangePasswordRequest) => Promise<any>;
  isChangingPassword: boolean;
  changePasswordError: Error | null;

  forgotPassword: (data: ForgotPasswordRequest) => void;
  forgotPasswordAsync: (data: ForgotPasswordRequest) => Promise<any>;
  isSendingForgotPassword: boolean;
  forgotPasswordError: Error | null;

  resetPassword: (data: ResetPasswordRequest) => void;
  resetPasswordAsync: (data: ResetPasswordRequest) => Promise<any>;
  isResettingPassword: boolean;
  resetPasswordError: Error | null;

  // Utility functions
  initializeAuth: () => Promise<void>;
  refetchUser: () => Promise<any>;
}

/**
 * Auth Hook
 * 
 * Provides authentication functionality with TanStack Query integration
 * and Zustand store synchronization.
 * 
 * Features:
 * - Automatic user data fetching on mount
 * - Login, logout, register mutations
 * - Password management (change, forgot, reset)
 * - Email verification
 * - 2FA support
 * - Automatic store synchronization
 */
export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, logout: logoutStore } = useAuthStore();
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Query: Get current user
  const {
    data: currentUser,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser,
  } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
    enabled: false, // Don't auto-fetch, call manually when needed
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Sync data to store when query data changes
    onSuccess: (data) => {
      if (data && data !== user) {
        setUser(data);
      }
    },
  });

  // Track if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync React Query cache with Zustand store
  useEffect(() => {
    if (currentUser && currentUser !== user) {
      setUser(currentUser);
    }
  }, [currentUser, user, setUser]);

  // Initialize auth on mount - check for tokens and fetch user if authenticated
  useEffect(() => {
    const initializeAuthOnMount = async () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        setIsInitializing(false);
        return;
      }

      // Check if we have tokens in localStorage
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Check React Query cache first
      const cachedUser = queryClient.getQueryData<User>(['auth', 'me']);

      // If we have tokens, always fetch fresh user data to ensure we have complete data
      if (accessToken || refreshToken) {
        // If we have a cached user with complete data, use it temporarily
        if (cachedUser && cachedUser.profile && cachedUser.privacy && cachedUser.security && !user) {
          setUser(cachedUser);
        }

        // Always fetch fresh data to ensure we have the latest complete user data
        try {
          const userData = await refetchUser();
          if (userData.data) {
            setUser(userData.data);
            queryClient.setQueryData(['auth', 'me'], userData.data);
            // Mark initialization as complete after user is loaded
            setIsInitializing(false);
            return;
          }
        } catch (error) {
          // Token invalid or expired - clear tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          logoutStore();
          queryClient.setQueryData(['auth', 'me'], null);
        }
      } else if (!accessToken && !refreshToken && user) {
        // No tokens but user in store - clear store
        logoutStore();
        queryClient.setQueryData(['auth', 'me'], null);
      }

      // Mark initialization as complete
      setIsInitializing(false);
    };

    initializeAuthOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Mutation: Register
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (response) => {
      // Don't auto-login after registration (email verification required)
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Mutation: Login
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async (response) => {
      if (response.requiresTwoFactor && response.tempToken) {
        // 2FA required - store tempToken for verification
        setTempToken(response.tempToken);
        return;
      }
      
      // Login successful - store tokens and fetch full user data
      if (response.user && response.accessToken && response.refreshToken) {
        // Store tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        // Fetch full user data with all relations (profile, privacy, security)
        try {
          const fullUser = await authService.getMe();
          setUser(fullUser);
          queryClient.setQueryData(['auth', 'me'], fullUser);
          router.push(`/${fullUser.username}/dashboard`);
        } catch (error) {
          // If getMe fails, use the partial user from login response
          setUser(response.user);
          queryClient.setQueryData(['auth', 'me'], response.user);
          router.push(`/${response.user.username}/dashboard`);
        }
      }
    },
    onError: () => {
      // Clear any stale user data
      logoutStore();
      queryClient.setQueryData(['auth', 'me'], null);
    },
  });

  // Mutation: Verify 2FA Login
  const verifyLogin2faMutation = useMutation({
    mutationFn: (data: { email: string; code: string }) => {
      if (!tempToken) {
        throw new Error('Temporary token not found. Please login again.');
      }
      return authService.verifyLogin2fa({
        ...data,
        tempToken,
      });
    },
    onSuccess: async (response) => {
      if (response.user && response.accessToken && response.refreshToken) {
        // Store tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        // Fetch full user data with all relations (profile, privacy, security)
        try {
          const fullUser = await authService.getMe();
          setUser(fullUser);
          queryClient.setQueryData(['auth', 'me'], fullUser);
          router.push(`/${fullUser.username}/dashboard`);
        } catch (error) {
          // If getMe fails, use the partial user from login response
          setUser(response.user);
          queryClient.setQueryData(['auth', 'me'], response.user);
          router.push(`/${response.user.username}/dashboard`);
        }
      }
    },
    onError: () => {
      logoutStore();
      queryClient.setQueryData(['auth', 'me'], null);
    },
  });

  // Mutation: Logout
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      logoutStore();
      queryClient.clear(); // Clear all queries
      router.push('/login');
    },
    onError: () => {
      // Even if logout fails, clear local state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      logoutStore();
      queryClient.clear();
      router.push('/login');
    },
  });

  // Mutation: Verify Email
  const verifyEmailMutation = useMutation({
    mutationFn: (data: VerifyEmailRequest) => authService.verifyEmail(data),
    onSuccess: async (response) => {
      // Invalidate and refetch full user data to get updated security status
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Refetch full user data with all relations (profile, privacy, security)
      try {
        const fullUser = await authService.getMe();
        setUser(fullUser);
        queryClient.setQueryData(['auth', 'me'], fullUser);
      } catch (error) {
        // If getMe fails, use the partial user from verification response
        if (response.user) {
          setUser(response.user);
          queryClient.setQueryData(['auth', 'me'], response.user);
        }
      }
    },
  });

  // Mutation: Resend Verify Email
  const resendVerifyEmailMutation = useMutation({
    mutationFn: (data: ResendVerifyEmailRequest) =>
      authService.resendVerifyEmail(data),
  });

  // Mutation: Change Password
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      authService.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Mutation: Forgot Password
  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordRequest) =>
      authService.forgotPassword(data),
  });

  // Mutation: Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordRequest) =>
      authService.resetPassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  /**
   * Initialize auth - fetch current user if authenticated
   */
  const initializeAuth = async () => {
    try {
      const userData = await refetchUser();
      if (userData.data) {
        setUser(userData.data);
      }
    } catch (error) {
      // User not authenticated or session expired
      logoutStore();
      queryClient.setQueryData(['auth', 'me'], null);
    }
  };

  /**
   * Check if user is authenticated
   * During SSR: only check user object to avoid hydration mismatches
   * On client: check tokens OR user to handle cases where tokens exist but user hasn't been fetched yet
   * During initialization with tokens: consider authenticated to prevent redirects
   */
  const hasTokens = typeof window !== 'undefined' && 
    (localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
  // On server or before mount, only check user. After mount or during init with tokens, also check tokens.
  const isAuthenticated = !!user || (isMounted && !!hasTokens) || (isInitializing && !!hasTokens);

  /**
   * Check if login requires 2FA
   */
  const requiresTwoFactor = loginMutation.data?.requiresTwoFactor ?? false;

  return {
    // User state
    user: user || currentUser || null,
    isAuthenticated,
    isInitializing,
    isLoadingUser,
    userError,

    // Auth actions
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    requiresTwoFactor,

    verifyLogin2fa: verifyLogin2faMutation.mutate,
    verifyLogin2faAsync: verifyLogin2faMutation.mutateAsync,
    isVerifying2fa: verifyLogin2faMutation.isPending,
    verify2faError: verifyLogin2faMutation.error,

    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    // Email verification
    verifyEmail: verifyEmailMutation.mutate,
    verifyEmailAsync: verifyEmailMutation.mutateAsync,
    isVerifyingEmail: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,

    resendVerifyEmail: resendVerifyEmailMutation.mutate,
    resendVerifyEmailAsync: resendVerifyEmailMutation.mutateAsync,
    isResendingVerifyEmail: resendVerifyEmailMutation.isPending,
    resendVerifyEmailError: resendVerifyEmailMutation.error,

    // Password management
    changePassword: changePasswordMutation.mutate,
    changePasswordAsync: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    changePasswordError: changePasswordMutation.error,

    forgotPassword: forgotPasswordMutation.mutate,
    forgotPasswordAsync: forgotPasswordMutation.mutateAsync,
    isSendingForgotPassword: forgotPasswordMutation.isPending,
    forgotPasswordError: forgotPasswordMutation.error,

    resetPassword: resetPasswordMutation.mutate,
    resetPasswordAsync: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,

    // Utility functions
    initializeAuth,
    refetchUser,
  };
};

