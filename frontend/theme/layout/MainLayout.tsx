'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Header } from './assets/header';
import { TopBar } from './assets/topbar';
import { Footer } from './assets/footer';
import { LeftSidebar } from './assets/lsidebar';
import { SkipLinks } from '@/theme/components/SkipLinks';
import { useKeyboardShortcuts } from '@/core/hooks/useKeyboardShortcuts';
import { useAuth } from '@/core/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Don't show MainLayout for auth routes
  if (pathname?.startsWith('/login') || 
      pathname?.startsWith('/register') || 
      pathname?.startsWith('/verify') || 
      pathname?.startsWith('/reset')) {
    return <>{children}</>;
  }
  
  // For /username page (not /browse or other routes), only show MainLayout when logged in
  // During SSR and initial render, always show layout to prevent hydration mismatch
  const isUsernamePage = pathname?.match(/^\/[^\/]+$/) && pathname !== '/browse' && pathname !== '/';
  const shouldShowLayout = isMounted ? !(isUsernamePage && !isAuthenticated) : true;
  
  const shouldShowSidebar = isAuthenticated && !isInitializing;
  
  // When MainLayout is not shown (logged-out /username), allow natural scrolling
  // Only apply this after mount to prevent hydration mismatch
  if (isMounted && !shouldShowLayout) {
    return <>{children}</>;
  }

  // Always show header and footer for all pages (except auth routes and logged-out /username)
  // During SSR, always render the layout structure to match client
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SkipLinks />
      <Header />
      <TopBar />
      <main id="main-content" className="flex flex-1 flex-col overflow-hidden min-h-0" tabIndex={-1}>
        <div className="flex flex-1 relative min-h-0">
          {/* Sidebar - Fixed element, always rendered, hidden with CSS when not needed */}
          <LeftSidebar />
          {/* Content area - adjusts margin when sidebar is visible */}
          <div className={cn('flex flex-1 flex-col w-full min-h-0 relative', shouldShowSidebar && 'lg:ml-80')}>
            <div className={cn('flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]', shouldShowLayout && 'pb-20')}>
              {children}
            </div>
            {shouldShowLayout && (
              <div className={cn('fixed bottom-0 z-10', shouldShowSidebar ? 'left-80 right-0' : 'left-0 right-0')}>
                <Footer />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

