'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Header } from './assets/Header';
import { Footer } from './assets/Footer';
import { LSidebar } from './assets/LSidebar';
import { RSidebar } from './assets/RSidebar';
import { useAuth } from '@/core/hooks/useAuth';
import { Flex, Box } from '@radix-ui/themes';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isInitializing } = useAuth();
  
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

  const shouldShowSidebars = isAuthenticated && !isInitializing;

  return (
    <Flex direction="column" style={{ height: '100vh', overflow: 'hidden' }}>
      <Header />
      <Flex style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {shouldShowSidebars && <LSidebar />}
        <Box 
          id="main-content"
          style={{
            flex: 1,
            marginLeft: shouldShowSidebars ? '256px' : '0',
            marginRight: shouldShowSidebars ? '256px' : '0',
            overflowY: 'auto',
            minHeight: 0,
            paddingBottom: '80px',
          }}
        >
          {children}
        </Box>
        {shouldShowSidebars && <RSidebar />}
      </Flex>
      <Footer />
    </Flex>
  );
}

