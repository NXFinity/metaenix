'use client';

import { MainLayout } from '@/theme/layout/MainLayout';
import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
import { Textarea } from '@/theme/ui/textarea';
import { Checkbox } from '@/theme/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/user';
import type { UpdateUserRequest } from '@/core/api/user/types/user.type';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check for tab query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'privacy', 'security'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: '',
    displayName: '',
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    website: '',
    dateOfBirth: '',
  });

  // Privacy form state
  const [privacyData, setPrivacyData] = useState({
    isFollowerOnly: false,
    isSubscriberOnly: false,
    isMatureContent: false,
    allowMessages: true,
    allowNotifications: true,
    allowFriendRequests: true,
  });

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        displayName: user.displayName || '',
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || '',
        dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
      });

      setPrivacyData({
        isFollowerOnly: user.privacy?.isFollowerOnly || false,
        isSubscriberOnly: user.privacy?.isSubscriberOnly || false,
        isMatureContent: user.privacy?.isMatureContent || false,
        allowMessages: user.privacy?.allowMessages ?? true,
        allowNotifications: user.privacy?.allowNotifications ?? true,
        allowFriendRequests: user.privacy?.allowFriendRequests ?? true,
      });
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userService.updateMe(data),
    onSuccess: () => {
      showNotification('success', 'Profile updated successfully');
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to update profile');
    },
  });

  // Update privacy mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userService.updateMe(data),
    onSuccess: () => {
      showNotification('success', 'Privacy settings updated successfully');
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to update privacy settings');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      username: profileData.username,
      displayName: profileData.displayName,
      profile: {
        firstName: profileData.firstName || undefined,
        lastName: profileData.lastName || undefined,
        bio: profileData.bio || undefined,
        location: profileData.location || undefined,
        website: profileData.website || undefined,
        dateOfBirth: profileData.dateOfBirth || undefined,
      },
    });
  };

  const handlePrivacySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePrivacyMutation.mutate({
      privacy: privacyData,
    });
  };

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <MainLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  // Require authentication - redirect if not authenticated
  if (!isInitializing && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // If authenticated but wrong user, redirect to their own settings
  if (!isInitializing && isAuthenticated && user && user.username !== username) {
    router.push(`/${user.username}/settings`);
    return null;
  }

  // Show loading if still initializing or user doesn't match
  if (isInitializing || !user || user.username !== username) {
    return (
      <MainLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${username}/dashboard`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Account Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your profile, privacy, and security settings
          </p>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              notification.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your profile information and personal details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        placeholder="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        placeholder="Display Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        placeholder="First Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us about yourself"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {profileData.bio.length}/500 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                        placeholder="Location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfileData({
                          username: user.username || '',
                          displayName: user.displayName || '',
                          firstName: user.profile?.firstName || '',
                          lastName: user.profile?.lastName || '',
                          bio: user.profile?.bio || '',
                          location: user.profile?.location || '',
                          website: user.profile?.website || '',
                          dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
                        });
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see your content and interact with you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePrivacySubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isFollowerOnly">Follower Only Content</Label>
                        <p className="text-sm text-muted-foreground">
                          Only allow followers to see your content
                        </p>
                      </div>
                      <Checkbox
                        id="isFollowerOnly"
                        checked={privacyData.isFollowerOnly}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, isFollowerOnly: checked === true })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isSubscriberOnly">Subscriber Only Content</Label>
                        <p className="text-sm text-muted-foreground">
                          Only allow subscribers to see your content
                        </p>
                      </div>
                      <Checkbox
                        id="isSubscriberOnly"
                        checked={privacyData.isSubscriberOnly}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, isSubscriberOnly: checked === true })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isMatureContent">Mature Content</Label>
                        <p className="text-sm text-muted-foreground">
                          Mark your content as mature/adult content
                        </p>
                      </div>
                      <Checkbox
                        id="isMatureContent"
                        checked={privacyData.isMatureContent}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, isMatureContent: checked === true })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowMessages">Allow Messages</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to send you direct messages
                        </p>
                      </div>
                      <Checkbox
                        id="allowMessages"
                        checked={privacyData.allowMessages}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, allowMessages: checked === true })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowNotifications">Allow Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications about activity on your account
                        </p>
                      </div>
                      <Checkbox
                        id="allowNotifications"
                        checked={privacyData.allowNotifications}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, allowNotifications: checked === true })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowFriendRequests">Allow Friend Requests</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to send you friend requests
                        </p>
                      </div>
                      <Checkbox
                        id="allowFriendRequests"
                        checked={privacyData.allowFriendRequests}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, allowFriendRequests: checked === true })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPrivacyData({
                          isFollowerOnly: user.privacy?.isFollowerOnly || false,
                          isSubscriberOnly: user.privacy?.isSubscriberOnly || false,
                          isMatureContent: user.privacy?.isMatureContent || false,
                          allowMessages: user.privacy?.allowMessages ?? true,
                          allowNotifications: user.privacy?.allowNotifications ?? true,
                          allowFriendRequests: user.privacy?.allowFriendRequests ?? true,
                        });
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={updatePrivacyMutation.isPending}>
                      {updatePrivacyMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        {user.security?.isVerified
                          ? 'Your email has been verified'
                          : 'Please verify your email address'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          user.security?.isVerified
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-yellow-600 dark:text-yellow-400 font-medium'
                        }
                      >
                        {user.security?.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                      {!user.security?.isVerified && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/verify">Verify Email</Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        {user.security?.isTwoFactorEnabled
                          ? '2FA is enabled on your account'
                          : 'Add an extra layer of security to your account'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          user.security?.isTwoFactorEnabled
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-muted-foreground font-medium'
                        }
                      >
                        {user.security?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Button variant="outline" size="sm" disabled>
                        {user.security?.isTwoFactorEnabled ? 'Manage' : 'Enable'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Password</Label>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-destructive">Danger Zone</Label>
                    <p className="text-sm text-muted-foreground">
                      Irreversible and destructive actions
                    </p>
                    <Button variant="destructive" size="sm" disabled>
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

