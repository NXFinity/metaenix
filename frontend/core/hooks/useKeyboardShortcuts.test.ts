import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ReactNode } from 'react';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
const mockUser = { id: '1', username: 'testuser' };
vi.mock('./useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: mockUser,
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set up keyboard event listeners', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should navigate to home on Ctrl+H', () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'h',
      ctrlKey: true,
    });
    
    window.dispatchEvent(event);
    
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should navigate to browse on Ctrl+B', () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
    });
    
    window.dispatchEvent(event);
    
    expect(mockPush).toHaveBeenCalledWith('/browse');
  });

  it('should navigate to profile on Ctrl+U when authenticated', () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
    });
    
    window.dispatchEvent(event);
    
    expect(mockPush).toHaveBeenCalledWith('/testuser');
  });

  it('should focus search on Ctrl+K', () => {
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.setAttribute('placeholder', 'Search');
    document.body.appendChild(searchInput);
    
    const focusSpy = vi.spyOn(searchInput, 'focus');
    
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    
    window.dispatchEvent(event);
    
    expect(focusSpy).toHaveBeenCalled();
    
    document.body.removeChild(searchInput);
  });

  it('should not trigger shortcuts when typing in input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'h',
      ctrlKey: true,
      target: input,
    });
    
    window.dispatchEvent(event);
    
    // Should not navigate because we're in an input
    expect(mockPush).not.toHaveBeenCalled();
    
    document.body.removeChild(input);
  });

  it('should close dialogs on Escape', () => {
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    document.body.appendChild(closeButton);
    
    const clickSpy = vi.spyOn(closeButton, 'click');
    
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });
    
    window.dispatchEvent(event);
    
    expect(clickSpy).toHaveBeenCalled();
    
    document.body.removeChild(closeButton);
  });
});

