'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followsService } from '@/core/api/follows';
import { userService } from '@/core/api/user';
import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/core/hooks/useAuth';
import {
  UserPlusIcon,
  UserMinusIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react';
import type { User } from '@/core/api/user/types/user.type';

// Date formatting helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Browse</h1>
          <p className="text-muted-foreground">
            Discover users from the community
          </p>
        </div>

        <UsersBrowse searchQuery={searchQuery} setSearchQuery={setSearchQuery} page={page} setPage={setPage} limit={limit} />
      </div>
    </>
  );
}

function UsersBrowse({
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  limit,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  limit: number;
}) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ['users', 'browse', page],
    queryFn: async () => {
      return userService.getAll({ page, limit });
    },
    enabled: true,
  });

  // Fetch follow suggestions if authenticated
  const {
    data: suggestionsData,
    isLoading: isLoadingSuggestions,
  } = useQuery({
    queryKey: ['follows', 'suggestions'],
    queryFn: () => followsService.getSuggestions(10),
    enabled: isAuthenticated,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Filter users by search query if provided
  const filteredUsers = usersData?.data.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Follow Suggestions (if authenticated) */}
      {isAuthenticated && suggestionsData && suggestionsData.length > 0 && !searchQuery && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Suggested Users</h2>
            <p className="text-sm text-muted-foreground">
              Users you might want to follow
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestionsData.slice(0, 6).map((suggestion) => (
                <UserCard
                  key={suggestion.id}
                  user={{
                    id: suggestion.id,
                    username: suggestion.username,
                    displayName: suggestion.displayName,
                    websocketId: '', // Not available in suggestions
                    role: 'Member', // Default role for suggestions
                    profile: suggestion.profile,
                    followersCount: suggestion.followersCount,
                    followingCount: 0,
                  }}
                  isSuggestion={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {isLoadingUsers ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </CardContent>
        </Card>
      ) : usersError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">Error loading users. Please try again.</p>
          </CardContent>
        </Card>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {usersData?.meta?.hasNextPage && !searchQuery && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={isLoadingUsers}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2 text-muted-foreground">
              {searchQuery ? 'No users found' : 'No users yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'No users to display'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserCard({ user, isSuggestion = false }: { user: User & { mutualConnections?: number }; isSuggestion?: boolean }) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const displayName = user.displayName || user.username || 'Unknown';
  const avatar = user.profile?.avatar;
  const isOwnProfile = currentUser?.id === user.id;

  const followMutation = useMutation({
    mutationFn: async (shouldFollow: boolean) => {
      if (shouldFollow) {
        return await followsService.follow(user.id);
      } else {
        return await followsService.unfollow(user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'browse'] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', user.username] });
    },
  });

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    // Check if current user is following this user
    if (isAuthenticated && currentUser && !isOwnProfile) {
      followsService
        .getFollowStatus(user.id)
        .then((status) => {
          setIsFollowing(status.isFollowing);
        })
        .catch(() => {
          setIsFollowing(false);
        });
    }
  }, [user.id, currentUser?.id, isAuthenticated, isOwnProfile]);

  const handleFollow = () => {
    if (!isAuthenticated || isOwnProfile || followMutation.isPending) return;
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    followMutation.mutate(newFollowState);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href={`/${user.username || ''}`}>
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {displayName[0].toUpperCase()}
                </span>
              )}
            </div>
          </Link>
          <div className="space-y-1">
            <Link href={`/${user.username || ''}`}>
              <p className="font-semibold text-foreground hover:underline">
                {displayName}
              </p>
            </Link>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {isSuggestion && (user as any).mutualConnections && (
              <p className="text-xs text-muted-foreground">
                {(user as any).mutualConnections} mutual connections
              </p>
            )}
          </div>
          {isAuthenticated && !isOwnProfile && (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              size="sm"
              onClick={handleFollow}
              disabled={followMutation.isPending}
              className="w-full"
            >
              {isFollowing ? (
                <>
                  <UserMinusIcon className="h-4 w-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

