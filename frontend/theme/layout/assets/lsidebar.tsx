'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { useUnreadCount } from '@/core/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { useMemo, memo, useRef, useEffect } from 'react';
import {
  HomeIcon,
  UserIcon,
  LayoutDashboardIcon,
  TrendingUpIcon,
  CodeIcon,
  SettingsIcon,
  CompassIcon,
  PlusIcon,
  FileTextIcon,
  BellIcon,
} from 'lucide-react';
import { Button } from '@/theme/ui/button';
import { Separator } from '@/theme/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  requiresDeveloper?: boolean;
  badge?: number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

function LeftSidebarComponent() {
  const pathname = usePathname();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { unreadCount } = useUnreadCount();
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Store previous pathname to detect changes
  const prevPathnameRef = useRef<string>(pathname);
  
  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Memoize navGroups to prevent unnecessary re-renders
  // MUST be called before any conditional returns (Rules of Hooks)
  const navGroups: NavGroup[] = useMemo(() => {
    if (!user) return [];
    
    return [
    {
      items: [
        {
          label: 'Home',
          href: '/',
          icon: HomeIcon,
        },
        {
          label: 'Browse',
          href: '/browse',
          icon: CompassIcon,
        },
        {
          label: 'Feed',
          href: `/${user.username}/feed`,
          icon: FileTextIcon,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Profile',
          href: `/${user.username}`,
          icon: UserIcon,
          requiresAuth: true,
        },
        {
          label: 'Notifications',
          href: `/${user.username}/notifications`,
          icon: BellIcon,
          requiresAuth: true,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        {
          label: 'Dashboard',
          href: `/${user.username}/dashboard`,
          icon: LayoutDashboardIcon,
          requiresAuth: true,
        },
        {
          label: 'Analytics',
          href: `/${user.username}/analytics`,
          icon: TrendingUpIcon,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'Tools',
      items: [
        {
          label: 'Developer',
          href: `/${user.username}/developer`,
          icon: CodeIcon,
          requiresAuth: true,
          requiresDeveloper: true,
          requiresAdmin: true,
        },
        {
          label: 'Test',
          href: '/test',
          icon: CodeIcon,
          requiresAuth: true,
          requiresAdmin: true,
        },
        {
          label: 'Settings',
          href: `/${user.username}/settings`,
          icon: SettingsIcon,
          requiresAuth: true,
        },
      ],
    },
    ];
  }, [user?.username, unreadCount]);

  // Stable function that checks if a route is active - memoized to prevent recreation
  const isActive = useMemo(() => {
    return (href: string) => {
      if (href === '/') {
        return pathname === '/';
      }
      
      // For profile page, only match exact path (not sub-pages)
      if (href === `/${user?.username}`) {
        return pathname === `/${user?.username}`;
      }
      
      // For notifications page, match exact path
      if (href === `/${user?.username}/notifications`) {
        return pathname === `/${user?.username}/notifications`;
      }
      
      // For other pages, check if pathname starts with href
      return pathname?.startsWith(href);
    };
  }, [pathname, user?.username]);

  const shouldShow = isAuthenticated && !isInitializing && user;

  return (
    <aside 
      ref={sidebarRef}
      className={cn(
        "hidden lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 lg:pb-4 lg:left-0 lg:bg-background/95 lg:backdrop-blur supports-[backdrop-filter]:bg-background/60",
        shouldShow ? "lg:flex lg:border-r lg:border-border" : "lg:hidden"
      )}
      suppressHydrationWarning
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* User Profile Section */}
        {isAuthenticated && user && (
          <div className="px-4 pt-6 pb-4 border-b border-border/50">
            <Link 
              href={`/${user.username}`} 
              prefetch={true} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all group",
                isActive(`/${user.username}`) && pathname !== `/${user.username}/dashboard` && pathname !== `/${user.username}/analytics` && pathname !== `/${user.username}/settings` && pathname !== `/${user.username}/developer`
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-border group-hover:ring-primary/20 transition-all">
                {user.profile?.avatar ? (
                  <Image
                    src={user.profile.avatar}
                    alt={user.displayName || user.username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized={user.profile.avatar.startsWith('http')}
                  />
                ) : (
                  <span className="text-base font-bold text-primary">
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {user.displayName || user.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Create Post Button */}
        {isAuthenticated && user && (
          <div className="px-4 pt-4 pb-2">
            <Button
              asChild
              className="w-full justify-center font-semibold shadow-sm"
              size="sm"
            >
              <Link href={`/${user.username}/posts`} prefetch={true}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Post
              </Link>
            </Button>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-4 space-y-6">
          {navGroups.map((group, groupIndex) => {
            const filteredItems = group.items.filter((item) => {
              if (item.requiresAuth && !isAuthenticated) return false;
              if (item.requiresDeveloper && !user?.isDeveloper) return false;
              if (item.requiresAdmin && user?.role !== 'Administrator') return false;
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-1">
                {group.label && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={`nav-${item.href}`}
                        href={item.href}
                        prefetch={true}
                        data-active={active}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                          active
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <Icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-transform",
                          active && "scale-110"
                        )} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full min-w-[20px] text-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Stats Section */}
        {isAuthenticated && user && (
          <>
            <div className="px-4 pb-4">
              <Separator className="mb-4" />
              <div className="space-y-3">
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Stats
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/${user.username}/followers`}
                    prefetch={true}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center group"
                  >
                    <div className="text-xl font-bold group-hover:text-primary transition-colors">
                      {user.followersCount?.toLocaleString() ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Followers</div>
                  </Link>
                  <Link
                    href={`/${user.username}/following`}
                    prefetch={true}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center group"
                  >
                    <div className="text-xl font-bold group-hover:text-primary transition-colors">
                      {user.followingCount?.toLocaleString() ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Following</div>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

// Export memoized component - prevents re-renders from parent component updates
// Note: Will still re-render when pathname changes (needed for active state)
// but React will efficiently update only the changed DOM nodes
export const LeftSidebar = memo(LeftSidebarComponent);

