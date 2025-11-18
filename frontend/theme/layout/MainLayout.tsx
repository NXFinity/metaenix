'use client';

import { usePathname } from 'next/navigation';
import { Header } from './assets/header';
import { Footer } from './assets/footer';
import { LeftSidebar } from './assets/lsidebar';
import { useAuth } from '@/core/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, isInitializing } = useAuth();
  
  // Don't show MainLayout for auth routes
  if (pathname?.startsWith('/login') || 
      pathname?.startsWith('/register') || 
      pathname?.startsWith('/verify') || 
      pathname?.startsWith('/reset')) {
    return <>{children}</>;
  }
  
  // For /username page (not /browse or other routes), only show MainLayout when logged in
  const isUsernamePage = pathname?.match(/^\/[^\/]+$/) && pathname !== '/browse' && pathname !== '/';
  const shouldShowLayout = !(isUsernamePage && !isAuthenticated);
  
  const shouldShowSidebar = isAuthenticated && !isInitializing;
  
  // When MainLayout is not shown (logged-out /username), allow natural scrolling
  if (!shouldShowLayout) {
    return <>{children}</>;
  }

  // Always show header and footer for all pages (except auth routes and logged-out /username)
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 relative min-h-0">
          {/* Sidebar - Fixed element, always rendered, hidden with CSS when not needed */}
          <LeftSidebar />
          {/* Content area - adjusts margin when sidebar is visible */}
          <div className={cn('flex-1 overflow-y-auto w-full min-h-0', shouldShowSidebar && 'lg:ml-64')}>
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

