'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core/hooks/useAuth';
import { followsService } from '@/core/api/users/follows';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { user, isAuthenticated, isInitializing } = useAuth();
  
  // Check if sidebar should be shown (same logic as MainLayout)
  const shouldShowSidebar = isAuthenticated && !isInitializing;

  // Only fetch following when user is authenticated
  const { data: followingData, isLoading } = useQuery({
    queryKey: ['following', 'topbar', user?.id],
    queryFn: () => followsService.getFollowing(user!.id, { page: 1, limit: 20 }),
    enabled: !!user?.id && isAuthenticated && !isInitializing,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  const following = followingData?.data || [];

  // Sort following by status priority: live > online > offline, then alphabetically within each group
  const sortedFollowing = [...following].sort((a, b) => {
    // Determine status for each user
    const aIsOnline = !!a.websocketId; // Placeholder - replace with actual status
    const aIsLive = false; // Placeholder for streaming feature
    const bIsOnline = !!b.websocketId; // Placeholder - replace with actual status
    const bIsLive = false; // Placeholder for streaming feature
    
    const aIsOffline = !aIsOnline;
    const bIsOffline = !bIsOnline;
    
    // Priority: live (0) > online (1) > offline (2)
    const getPriority = (isLive: boolean, isOnline: boolean, isOffline: boolean) => {
      if (isLive) return 0;
      if (isOnline) return 1;
      if (isOffline) return 2;
      return 2; // Default to offline
    };
    
    const aPriority = getPriority(aIsLive, aIsOnline, aIsOffline);
    const bPriority = getPriority(bIsLive, bIsOnline, bIsOffline);
    
    // First sort by priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // If same priority, sort alphabetically by username
    const aUsername = (a.username || '').toLowerCase();
    const bUsername = (b.username || '').toLowerCase();
    return aUsername.localeCompare(bUsername);
  });

  // Don't render if not authenticated or still initializing
  if (!isAuthenticated || isInitializing || !user) {
    return null;
  }

  // Don't render if no following users
  if (!isLoading && sortedFollowing.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "w-full border-b border-border/20 bg-muted/30 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/20",
      shouldShowSidebar && "lg:ml-80"
    )}>
      <div className="w-full px-4">
        <div className="flex items-center gap-3 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Following</span>
          {isLoading ? (
            <div className="flex items-center gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0"
                />
              ))}
            </div>
          ) : (
            <>
              {sortedFollowing.map((followedUser) => {
                const avatar = followedUser.profile?.avatar;
                const displayName = followedUser.displayName || followedUser.username;
                
                // Determine user status (for now, assume online if websocketId exists, offline otherwise)
                // TODO: Replace with actual online status from WebSocket or API when available
                // TODO: Add isLive/isStreaming check when streaming feature is added
                const isOnline = !!followedUser.websocketId; // Placeholder - replace with actual status
                const isLive = false; // Placeholder for streaming feature
                const isOffline = !isOnline;
                
                return (
                  <Link
                    key={followedUser.id}
                    href={`/${followedUser.username}`}
                    prefetch={true}
                    className={cn(
                      "flex-shrink-0 group relative transition-all duration-200",
                      "hover:scale-110 active:scale-95"
                    )}
                    title={displayName}
                  >
                    <div className="relative">
                      <div className={cn(
                        "relative w-10 h-10 rounded-full overflow-hidden transition-all duration-200",
                        isOffline && "opacity-50 grayscale",
                        isOnline && !isLive && "ring-2 ring-green-500",
                        isLive && "ring-2 ring-red-500",
                        !isOnline && !isLive && "ring-2 ring-border",
                        "group-hover:ring-primary/50"
                      )}>
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt={displayName}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized={avatar.startsWith('http')}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/40 via-primary/30 to-secondary/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {displayName[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Status indicator dot */}
                      {!isOffline && (
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                          isLive ? "bg-red-500" : "bg-green-500"
                        )} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

