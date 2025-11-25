'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/theme/ui/button';
import { UserMenu } from '@/theme/components/UserMenu';
import { ThemeToggle } from '@/theme/components/ThemeToggle';
import { NotificationsMenu } from '@/theme/components/NotificationsMenu';
import { AdminNotifications } from '@/theme/components/AdminNotifications';
import { SocketStatus } from '@/theme/components/SocketStatus';

export function Header() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const logoSrc = isMounted && resolvedTheme === 'light'
    ? '/images/logos/logo-dark.png'
    : '/images/logos/logo.png';

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <nav id="main-navigation" className="container mx-auto flex h-16 items-center justify-between px-4" aria-label="Main navigation" tabIndex={-1}>
        <div className="flex items-center space-x-4">
          <Link href="/" prefetch={true} className="flex items-center">
            <Image
              src={logoSrc}
              alt="Meta EN|IX"
              width={120}
              height={40}
              className="h-10 w-auto"
              style={{ width: 'auto', height: '2.5rem' }}
              priority
            />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/browse" prefetch={true}>Browse</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/status" prefetch={true}>Status</Link>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          
          {!isMounted || isInitializing ? (
            <div className="flex items-center space-x-4">
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </div>
          ) : isAuthenticated ? (
            <>
              <SocketStatus />
              <NotificationsMenu />
              <AdminNotifications />
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" prefetch={true}>Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register" prefetch={true}>Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
