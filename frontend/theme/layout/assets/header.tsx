'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { Button } from '@/theme/ui/button';
import { UserMenu } from '@/theme/components/UserMenu';

export function Header() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logos/logo.png"
            alt="Meta EN|IX"
            width={120}
            height={40}
            className="h-10 w-auto"
            style={{ width: 'auto' }}
            priority
          />
        </Link>

        {/* Auth Actions */}
        <div className="flex items-center space-x-4">
          {!isMounted || isInitializing ? (
            // Show loading state during SSR and initialization to avoid hydration mismatch
            <div className="flex items-center space-x-4">
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </div>
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

