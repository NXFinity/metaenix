'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useMemo, memo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/core/api/data/analytics';
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
  VideoIcon,
  ImageIcon,
  Palette,
  Shield,
} from 'lucide-react';
import { Button } from '@/theme/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  requiresDeveloper?: boolean;
  requiresAdmin?: boolean;
  badge?: number;
  onClick?: (e: React.MouseEvent) => void | Promise<void>;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

function LeftSidebarComponent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Store previous pathname to detect changes
  const prevPathnameRef = useRef<string>(pathname);
  
  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Fetch user analytics for accurate follower/following counts
  const { data: userAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => analyticsService.getUserAnalytics(user!.id),
    enabled: !!user?.id && isAuthenticated,
    staleTime: 60000, // Cache for 1 minute
  });

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user?.role) return false;
    const adminRoles = ['Administrator', 'Founder', 'Chief Executive'];
    return adminRoles.includes(user.role);
  }, [user?.role]);

  // Memoize navGroups to prevent unnecessary re-renders
  // MUST be called before any conditional returns (Rules of Hooks)
  const navGroups: NavGroup[] = useMemo(() => {
    if (!user) return [];
    
    const groups: NavGroup[] = [
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
      label: 'Your Content',
      items: [
        {
          label: 'Profile',
          href: `/${user.username}`,
          icon: UserIcon,
          requiresAuth: true,
        },
        {
          label: 'Posts',
          href: `/${user.username}/posts`,
          icon: FileTextIcon,
          requiresAuth: true,
        },
        {
          label: 'Videos',
          href: `/${user.username}/videos`,
          icon: VideoIcon,
          requiresAuth: true,
        },
        {
          label: 'Photos',
          href: `/${user.username}/photos`,
          icon: ImageIcon,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'Insights',
      items: [
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
      label: 'Settings',
      items: [
        {
          label: 'Settings',
          href: `/${user.username}/settings`,
          icon: SettingsIcon,
          requiresAuth: true,
        },
        {
          label: 'Appearance',
          href: `/${user.username}/apperance`,
          icon: Palette,
          requiresAuth: true,
        },
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
      ],
    },
    ];

    // Only add Administration category for admins
    if (isAdmin) {
      groups.push({
        label: 'Administration',
        items: [
          {
            label: 'Admin Dashboard',
            href: '#admin-dashboard', // Use hash to prevent navigation, we'll handle it with onClick
            icon: Shield,
            requiresAuth: true,
            requiresAdmin: true,
            onClick: async (e: React.MouseEvent) => {
              e.preventDefault();
              try {
                console.log('Creating admin session...');
                const { authService } = await import('@/core/api/security/auth/auth.service');
                const result = await authService.createAdminSession();
                console.log('Admin session created:', { hasToken: !!result.sessionToken });
                
                if (!result.sessionToken) {
                  throw new Error('No session token received');
                }
                
                // Open admin client in new window with session token
                const adminClientUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
                const url = `${adminClientUrl}?sessionToken=${result.sessionToken}`;
                console.log('Opening admin client:', url);
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch (error: any) {
                console.error('Failed to create admin session:', error);
                console.error('Error details:', {
                  message: error?.message,
                  response: error?.response?.data,
                  status: error?.response?.status,
                });
                // Show error to user
                const errorMessage = error?.response?.data?.message || error?.message || 'Failed to access admin dashboard';
                alert(`Failed to access admin dashboard: ${errorMessage}`);
              }
            },
          },
        ],
      });
    }

    return groups;
  }, [user?.username, isAdmin]);

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
      
      // For other pages, check if pathname starts with href
      return pathname?.startsWith(href);
    };
  }, [pathname, user?.username]);

  const shouldShow = isAuthenticated && !isInitializing && user;

  return (
    <aside 
      ref={sidebarRef}
      role="complementary"
      aria-label="Main navigation"
      className={cn(
        "hidden lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 lg:pb-4 lg:left-0 lg:bg-gradient-to-b from-background via-background/98 to-background lg:backdrop-blur-xl supports-[backdrop-filter]:bg-background/80",
        "lg:border-r lg:border-border/60 lg:shadow-lg lg:shadow-black/5",
        shouldShow ? "lg:flex" : "lg:hidden"
      )}
      suppressHydrationWarning
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Enhanced User Profile Card */}
        {isAuthenticated && user && (
          <div className="px-6 pt-6 pb-4">
            <Link 
              href={`/${user.username}`} 
              prefetch={true} 
              className={cn(
                "block rounded-2xl transition-all duration-300 group overflow-hidden",
                isActive(`/${user.username}`) && pathname !== `/${user.username}/dashboard` && pathname !== `/${user.username}/analytics` && pathname !== `/${user.username}/settings` && pathname !== `/${user.username}/developer`
                  ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg shadow-primary/10 border-2 border-primary/30"
                  : "bg-card/50 backdrop-blur-sm hover:bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
              )}
            >
              {/* Profile Header with Avatar */}
              <div className="p-6 pb-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex-shrink-0 mb-4">
                    <div className={cn(
                      "relative w-20 h-20 rounded-2xl overflow-hidden ring-4 transition-all duration-300",
                      isActive(`/${user.username}`) && pathname !== `/${user.username}/dashboard` && pathname !== `/${user.username}/analytics` && pathname !== `/${user.username}/settings` && pathname !== `/${user.username}/developer`
                        ? "ring-primary/40 shadow-lg shadow-primary/20 scale-105"
                        : "ring-border/40 group-hover:ring-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-105"
                    )}>
                      {user.profile?.avatar ? (
                        <Image
                          src={user.profile.avatar}
                          alt={user.displayName || user.username}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          priority
                          unoptimized={user.profile.avatar.startsWith('http')}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/40 via-primary/30 to-secondary/30 flex items-center justify-center">
                          <span className="text-3xl font-bold text-primary">
                            {(user.displayName || user.username)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center ring-2 ring-background shadow-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-lg font-bold truncate group-hover:text-primary transition-colors mb-1">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mb-3">
                      @{user.username}
                    </div>
                    {user.profile?.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed px-2">
                        {user.profile.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="px-5 pb-5 border-t border-border/30 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/${user.username}/followers`);
                    }}
                    className="text-center p-3 rounded-xl hover:bg-primary/10 transition-all duration-200 cursor-pointer group/stat border border-transparent hover:border-primary/20"
                  >
                    <div className="text-2xl font-bold group-hover/stat:text-primary transition-colors">
                      {userAnalytics?.followersCount?.toLocaleString() ?? user.followersCount?.toLocaleString() ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium mt-1">Followers</div>
                  </div>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/${user.username}/following`);
                    }}
                    className="text-center p-3 rounded-xl hover:bg-primary/10 transition-all duration-200 cursor-pointer group/stat border border-transparent hover:border-primary/20"
                  >
                    <div className="text-2xl font-bold group-hover/stat:text-primary transition-colors">
                      {userAnalytics?.followingCount?.toLocaleString() ?? user.followingCount?.toLocaleString() ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium mt-1">Following</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Create Post Button */}
        {isAuthenticated && user && (
          <div className="px-6 pb-4">
            <Button
              asChild
              className="w-full justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-base rounded-xl bg-gradient-to-r from-primary via-primary/95 to-primary hover:from-primary/95 hover:via-primary hover:to-primary/95 border-0 hover:scale-[1.02]"
              size="lg"
            >
              <Link href={`/${user.username}/posts`} prefetch={true}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Post
              </Link>
            </Button>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 px-5 py-6 space-y-8" aria-label="Navigation menu">
          {navGroups.map((group, groupIndex) => {
            const filteredItems = group.items.filter((item) => {
              if (item.requiresAuth && !isAuthenticated) return false;
              if (item.requiresDeveloper && !user?.isDeveloper) return false;
              if (item.requiresAdmin && !isAdmin) return false;
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.label && (
                  <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const Component = item.onClick ? 'button' : Link;
                    const linkProps = item.onClick 
                      ? { onClick: item.onClick }
                      : { href: item.href, prefetch: true };
                    
                    return (
                      <Component
                        key={`nav-${item.href}`}
                        {...linkProps}
                        data-active={active}
                        className={cn(
                          'relative flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group w-full text-left',
                          active
                            ? 'bg-primary/15 text-primary shadow-md shadow-primary/10 border border-primary/20'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-accent/50'
                        )}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-sm shadow-primary/50" />
                        )}
                        <Icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-all duration-200",
                          active && "scale-110 text-primary"
                        )} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="px-2.5 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full min-w-[24px] text-center shadow-sm">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Component>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

      </div>
    </aside>
  );
}

// Export memoized component - prevents re-renders from parent component updates
// Note: Will still re-render when pathname changes (needed for active state)
// but React will efficiently update only the changed DOM nodes
export const LeftSidebar = memo(LeftSidebarComponent);

