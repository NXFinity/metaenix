'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/theme/ui/dropdown-menu';
import { Button } from '@/theme/ui/button';
import { LogOutIcon, LayoutDashboardIcon } from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, logout, isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Don't render anything during SSR to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render if not authenticated
  if (!isAuthenticated) return null;

  // If authenticated but user not loaded yet, show loading state
  if (!user && (isInitializing || isAuthenticated)) {
    return (
      <Button variant="ghost" className="flex items-center gap-2 h-auto p-1.5" disabled>
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <span className="hidden sm:inline-block text-sm font-medium w-20 h-4 bg-muted animate-pulse rounded" />
      </Button>
    );
  }

  // If no user after initialization, don't render
  if (!user) return null;

  const displayName = user.displayName || user.username;
  const avatar = user.profile?.avatar;
  const email = user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto p-1.5 hover:bg-accent"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {avatar ? (
              <Image
                src={avatar}
                alt={displayName}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                {displayName[0].toUpperCase()}
              </span>
            )}
          </div>
          <span className="hidden sm:inline-block text-sm font-medium">
            {user.username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {email && (
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${user.username}/dashboard`} className="cursor-pointer">
            <LayoutDashboardIcon className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

