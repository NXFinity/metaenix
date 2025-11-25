'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const routerRef = useRef(router);
  const authRef = useRef({ isAuthenticated, user });

  // Keep refs updated
  useEffect(() => {
    routerRef.current = router;
    authRef.current = { isAuthenticated, user };
  }, [router, isAuthenticated, user]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]')
    ) {
      // Allow Escape key to work even in inputs
      if (event.key === 'Escape') {
        event.preventDefault();
        // Close any open modals/dialogs
        const closeButtons = document.querySelectorAll('[data-dialog-close], [aria-label*="Close"], button[aria-label*="close"]');
        const lastCloseButton = closeButtons[closeButtons.length - 1] as HTMLElement;
        if (lastCloseButton) {
          lastCloseButton.click();
        }
      }
      return;
    }

    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    // Ctrl/Cmd + K or / - Focus search
    if ((ctrlOrCmd && event.key.toLowerCase() === 'k') || event.key === '/') {
      event.preventDefault();
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
      return;
    }

    // Ctrl/Cmd + H - Go to home
    if (ctrlOrCmd && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      routerRef.current.push('/');
      return;
    }

    // Ctrl/Cmd + B - Go to browse
    if (ctrlOrCmd && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      routerRef.current.push('/browse');
      return;
    }

    // Ctrl/Cmd + U - Go to profile (if authenticated)
    if (ctrlOrCmd && event.key.toLowerCase() === 'u') {
      event.preventDefault();
      if (authRef.current.isAuthenticated && authRef.current.user) {
        routerRef.current.push(`/${authRef.current.user.username}`);
      }
      return;
    }

    // Escape - Close dialogs
    if (event.key === 'Escape') {
      event.preventDefault();
      const closeButtons = document.querySelectorAll('[data-dialog-close], [aria-label*="Close"], button[aria-label*="close"]');
      const lastCloseButton = closeButtons[closeButtons.length - 1] as HTMLElement;
      if (lastCloseButton) {
        lastCloseButton.click();
      }
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

