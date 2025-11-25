'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
import { Textarea } from '@/theme/ui/textarea';
import { Checkbox } from '@/theme/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/users/user';
import { storageService } from '@/core/api/storage';
import { StorageType } from '@/core/api/storage/types/storage.type';
import type { UpdateUserRequest } from '@/core/api/users/user/types/user.type';
import { ArrowLeftIcon, UploadIcon, XIcon, MoveIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import { twofaService } from '@/core/api/security/twofa';
import type { SetupTwoFactorResponse, BackupCodesResponse } from '@/core/api/security/twofa';

export default function SettingsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2FA state
  const [twofaDialogOpen, setTwofaDialogOpen] = useState(false);
  const [twofaStep, setTwofaStep] = useState<'password' | 'qr' | 'verify' | 'backup'>('password');
  const [twofaPassword, setTwofaPassword] = useState('');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaSetupData, setTwofaSetupData] = useState<SetupTwoFactorResponse | null>(null);
  const [twofaBackupCodes, setTwofaBackupCodes] = useState<string[] | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check for tab query parameter
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'privacy', 'security', 'social'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    isPublic: true,
    isFollowerOnly: false,
    isSubscriberOnly: false,
    isMatureContent: false,
    allowMessages: true,
    allowNotifications: true,
    allowFriendRequests: true,
    notifyOnFollow: true,
  });

  // Social form state
  const [socialData, setSocialData] = useState({
    twitter: '',
    instagram: '',
    facebook: '',
    youtube: '',
    discord: '',
    twitch: '',
  });

  // Image upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState({ x: 0, y: 0 });
  const [coverScale, setCoverScale] = useState(1);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const coverImageRef = useRef<HTMLImageElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const [bannerPosition, setBannerPosition] = useState({ x: 0, y: 0 });
  const [bannerScale, setBannerScale] = useState(1);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [bannerDragStart, setBannerDragStart] = useState({ x: 0, y: 0 });
  const bannerImageRef = useRef<HTMLImageElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

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
        isPublic: user.isPublic ?? true,
        isFollowerOnly: user.privacy?.isFollowerOnly || false,
        isSubscriberOnly: user.privacy?.isSubscriberOnly || false,
        isMatureContent: user.privacy?.isMatureContent || false,
        allowMessages: user.privacy?.allowMessages ?? true,
        allowNotifications: user.privacy?.allowNotifications ?? true,
        allowFriendRequests: user.privacy?.allowFriendRequests ?? true,
        notifyOnFollow: user.privacy?.notifyOnFollow ?? true,
      });

      setSocialData({
        twitter: user.social?.twitter || '',
        instagram: user.social?.instagram || '',
        facebook: user.social?.facebook || '',
        youtube: user.social?.youtube || '',
        discord: user.social?.discord || '',
        twitch: user.social?.twitch || '',
      });

      // Set image previews
      setAvatarPreview(user.profile?.avatar || null);
      setCoverPreview(user.profile?.cover || null);
      setCoverImageSrc(user.profile?.cover || null);
      setBannerPreview(user.profile?.banner || null);
      setBannerImageSrc(user.profile?.banner || null);
    }
  }, [user]);

  // Global mouse handlers to prevent page scrolling when dragging cover
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingCover && coverImageSrc) {
        e.preventDefault();
        setCoverPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingCover) {
        setIsDraggingCover(false);
      }
    };

    if (isDraggingCover) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDraggingCover, dragStart, coverImageSrc]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userService.updateMe(data),
    onSuccess: (response) => {
      showNotification('success', 'Profile updated successfully');
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      // Force refetch to ensure we get the latest data including social
      queryClient.refetchQueries({ queryKey: ['user', 'profile', username] });
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

  // 2FA mutations
  const setupTwofaMutation = useMutation({
    mutationFn: (password: string) => twofaService.setup({ password }),
    onSuccess: (data) => {
      setTwofaSetupData(data);
      setTwofaStep('qr');
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message?.[0] || 'Failed to setup 2FA');
    },
  });

  const enableTwofaMutation = useMutation({
    mutationFn: (code: string) => twofaService.enable({ code }),
    onSuccess: (data) => {
      setTwofaBackupCodes(data.codes);
      setTwofaStep('backup');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetchUser();
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message?.[0] || 'Invalid verification code');
    },
  });

  const handleTwofaSetup = async () => {
    if (!twofaPassword) {
      showNotification('error', 'Please enter your password');
      return;
    }
    setupTwofaMutation.mutate(twofaPassword);
  };

  const handleTwofaEnable = async () => {
    if (!twofaCode || twofaCode.length !== 6) {
      showNotification('error', 'Please enter a valid 6-digit code');
      return;
    }
    enableTwofaMutation.mutate(twofaCode);
  };

  const handleTwofaDialogClose = () => {
    setTwofaDialogOpen(false);
    setTwofaStep('password');
    setTwofaPassword('');
    setTwofaCode('');
    setTwofaSetupData(null);
    setTwofaBackupCodes(null);
  };

  const handleImageUpload = async (file: File, subType: 'avatar' | 'cover' | 'banner'): Promise<string | null> => {
    // Banner uses 'cover' sub-type for storage since backend doesn't support 'banner'
    const storageSubType = subType === 'banner' ? 'cover' : subType;
    try {
      setUploadingImage(subType);
      const response = await storageService.upload({
        file,
        storageType: StorageType.PROFILE,
        subType: storageSubType,
      });
      return response.url;
    } catch (error: any) {
      showNotification('error', error?.response?.data?.message || `Failed to upload ${subType}`);
      return null;
    } finally {
      setUploadingImage(null);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload images first if files are selected
    let avatarUrl = avatarPreview;
    let coverUrl = coverPreview;
    let bannerUrl = bannerPreview;

    if (avatarFile) {
      const url = await handleImageUpload(avatarFile, 'avatar');
      if (url) avatarUrl = url;
      else return; // Stop if upload failed
    }

    if (coverFile) {
      // Crop cover image before uploading
      const croppedFile = await cropCoverImage();
      if (croppedFile) {
        const url = await handleImageUpload(croppedFile, 'cover');
        if (url) coverUrl = url;
        else return;
      }
    }

    if (bannerFile) {
      const url = await handleImageUpload(bannerFile, 'banner');
      if (url) bannerUrl = url;
      else return;
    }

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
        avatar: avatarUrl || undefined,
        cover: coverUrl || undefined,
        banner: bannerUrl || undefined,
      },
    });

    // Clear file states after successful submission
    setAvatarFile(null);
    setCoverFile(null);
    setBannerFile(null);
  };

  const handlePrivacySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePrivacyMutation.mutate({
      isPublic: privacyData.isPublic,
      privacy: {
        isFollowerOnly: privacyData.isFollowerOnly,
        isSubscriberOnly: privacyData.isSubscriberOnly,
        isMatureContent: privacyData.isMatureContent,
        allowMessages: privacyData.allowMessages,
        allowNotifications: privacyData.allowNotifications,
        allowFriendRequests: privacyData.allowFriendRequests,
        notifyOnFollow: privacyData.notifyOnFollow,
      },
    });
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'cover' | 'banner',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please select an image file');
      return;
    }

    // Validate file size (5MB max for profile images)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(result);
      } else if (type === 'cover') {
        setCoverFile(file);
        setCoverImageSrc(result);
        setCoverPreview(result);
        // Reset position and scale for new image
        setCoverPosition({ x: 0, y: 0 });
        // Calculate initial scale to fit the image in the container
        const img = new window.Image();
        img.onload = () => {
          const containerAspect = 3 / 1; // 3:1 aspect ratio
          const imgAspect = img.width / img.height;

          // If image is wider than container, scale to fit height
          // If image is taller than container, scale to fit width
          let initialScale = 1;
          if (imgAspect > containerAspect) {
            // Image is wider - need to scale to fit height, then might need to scale up
            initialScale = 1; // Start at 1, user can zoom
          } else {
            // Image is taller - need to scale to fit width
            initialScale = containerAspect / imgAspect;
          }
          setCoverScale(initialScale);
        };
        img.src = result;
      } else if (type === 'banner') {
        setBannerFile(file);
        setBannerImageSrc(result);
        setBannerPreview(result);
        // Reset position and scale for new image
        setBannerPosition({ x: 0, y: 0 });
        // Calculate initial scale to fit the image in the container
        const img = new window.Image();
        img.onload = () => {
          const containerAspect = 3 / 1; // 3:1 aspect ratio
          const imgAspect = img.width / img.height;

          // If image is wider than container, scale to fit height
          // If image is taller than container, scale to fit width
          let initialScale = 1;
          if (imgAspect > containerAspect) {
            // Image is wider - need to scale to fit height, then might need to scale up
            initialScale = 1; // Start at 1, user can zoom
          } else {
            // Image is taller - need to scale to fit width
            initialScale = containerAspect / imgAspect;
          }
          setBannerScale(initialScale);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Cover image drag handlers - only work within container
  const handleCoverMouseDown = (e: React.MouseEvent) => {
    if (!coverImageSrc) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(true);
    setDragStart({
      x: e.clientX - coverPosition.x,
      y: e.clientY - coverPosition.y,
    });
  };

  const handleCoverMouseMove = (e: React.MouseEvent) => {
    // Mouse move is handled globally in useEffect
    if (!isDraggingCover || !coverImageSrc) return;
  };

  const handleCoverMouseUp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDraggingCover(false);
  };

  // Cover image wheel zoom - only work within container
  const handleCoverWheel = (e: React.WheelEvent) => {
    if (!coverImageSrc) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setCoverScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Banner image drag handlers
  const handleBannerMouseDown = (e: React.MouseEvent) => {
    if (!bannerImageSrc) return;
    setIsDraggingBanner(true);
    setBannerDragStart({
      x: e.clientX - bannerPosition.x,
      y: e.clientY - bannerPosition.y,
    });
  };

  const handleBannerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBanner || !bannerImageSrc) return;
    e.preventDefault();
    setBannerPosition({
      x: e.clientX - bannerDragStart.x,
      y: e.clientY - bannerDragStart.y,
    });
  };

  const handleBannerMouseUp = () => {
    setIsDraggingBanner(false);
  };

  // Banner image wheel zoom
  const handleBannerWheel = (e: React.WheelEvent) => {
    if (!bannerImageSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setBannerScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Crop and convert cover image to blob
  const cropCoverImage = async (): Promise<File | null> => {
    if (!coverImageSrc || !coverFile || !coverImageRef.current) return coverFile;

    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(coverFile);
          return;
        }

        // Fixed target dimensions: 1500x500 (3:1 ratio)
        const targetWidth = 1500;
        const targetHeight = 500;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Get actual container dimensions
        const container = coverImageRef.current?.parentElement?.parentElement;
        if (!container) {
          resolve(coverFile);
          return;
        }
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // The image is centered, then scaled and translated
        // Transform origin is center of image
        // We need to find what part of the original image is visible

        // Scaled image dimensions
        const scaledWidth = img.naturalWidth * coverScale;
        const scaledHeight = img.naturalHeight * coverScale;

        // Image center position in container coordinates (after transform)
        // Container center is at (750, 250) for 1500x500
        const imageCenterX = containerWidth / 2 + coverPosition.x;
        const imageCenterY = containerHeight / 2 + coverPosition.y;

        // Calculate the visible rectangle in scaled image coordinates
        // The visible area is the intersection of container and scaled image
        const visibleLeft = Math.max(0, imageCenterX - scaledWidth / 2);
        const visibleTop = Math.max(0, imageCenterY - scaledHeight / 2);
        const visibleRight = Math.min(containerWidth, imageCenterX + scaledWidth / 2);
        const visibleBottom = Math.min(containerHeight, imageCenterY + scaledHeight / 2);

        const visibleWidth = visibleRight - visibleLeft;
        const visibleHeight = visibleBottom - visibleTop;

        // Convert visible area to original image coordinates
        // Offset from image center in scaled coordinates
        const offsetX = visibleLeft - (imageCenterX - scaledWidth / 2);
        const offsetY = visibleTop - (imageCenterY - scaledHeight / 2);

        // Convert to original image coordinates
        const sourceX = offsetX / coverScale;
        const sourceY = offsetY / coverScale;
        const sourceWidth = visibleWidth / coverScale;
        const sourceHeight = visibleHeight / coverScale;

        // Draw cropped image
        ctx.drawImage(
          img,
          Math.max(0, sourceX),
          Math.max(0, sourceY),
          Math.min(img.naturalWidth, sourceWidth),
          Math.min(img.naturalHeight, sourceHeight),
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], coverFile.name, { type: coverFile.type });
            resolve(file);
          } else {
            resolve(coverFile);
          }
        }, coverFile.type, 0.95);
      };
      img.src = coverImageSrc;
    });
  };

  // Crop and convert banner image to blob
  const cropBannerImage = async (): Promise<File | null> => {
    if (!bannerImageSrc || !bannerFile || !bannerImageRef.current) return bannerFile;

    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(bannerFile);
          return;
        }

        // Fixed target dimensions: 1500x500 (3:1 ratio)
        const targetWidth = 1500;
        const targetHeight = 500;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Get actual container dimensions
        const container = bannerImageRef.current?.parentElement?.parentElement;
        if (!container) {
          resolve(bannerFile);
          return;
        }
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // The image is centered, then scaled and translated
        // Transform origin is center of image
        // We need to find what part of the original image is visible

        // Scaled image dimensions
        const scaledWidth = img.naturalWidth * bannerScale;
        const scaledHeight = img.naturalHeight * bannerScale;

        // Image center position in container coordinates (after transform)
        // Container center is at (750, 250) for 1500x500
        const imageCenterX = containerWidth / 2 + bannerPosition.x;
        const imageCenterY = containerHeight / 2 + bannerPosition.y;

        // Calculate the visible rectangle in scaled image coordinates
        // The visible area is the intersection of container and scaled image
        const visibleLeft = Math.max(0, imageCenterX - scaledWidth / 2);
        const visibleTop = Math.max(0, imageCenterY - scaledHeight / 2);
        const visibleRight = Math.min(containerWidth, imageCenterX + scaledWidth / 2);
        const visibleBottom = Math.min(containerHeight, imageCenterY + scaledHeight / 2);

        const visibleWidth = visibleRight - visibleLeft;
        const visibleHeight = visibleBottom - visibleTop;

        // Convert visible area to original image coordinates
        // Offset from image center in scaled coordinates
        const offsetX = visibleLeft - (imageCenterX - scaledWidth / 2);
        const offsetY = visibleTop - (imageCenterY - scaledHeight / 2);

        // Convert to original image coordinates
        const sourceX = offsetX / bannerScale;
        const sourceY = offsetY / bannerScale;
        const sourceWidth = visibleWidth / bannerScale;
        const sourceHeight = visibleHeight / bannerScale;

        // Draw cropped image
        ctx.drawImage(
          img,
          Math.max(0, sourceX),
          Math.max(0, sourceY),
          Math.min(img.naturalWidth, sourceWidth),
          Math.min(img.naturalHeight, sourceHeight),
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], bannerFile.name, { type: bannerFile.type });
            resolve(file);
          } else {
            resolve(bannerFile);
          }
        }, bannerFile.type, 0.95);
      };
      img.src = bannerImageSrc;
    });
  };

  const handleRemoveImage = (type: 'avatar' | 'cover' | 'banner') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(user?.profile?.avatar || null);
    } else if (type === 'cover') {
      setCoverFile(null);
      setCoverPreview(user?.profile?.cover || null);
    } else if (type === 'banner') {
      setBannerFile(null);
      setBannerPreview(user?.profile?.banner || null);
      setBannerImageSrc(user?.profile?.banner || null);
      setBannerPosition({ x: 0, y: 0 });
      setBannerScale(1);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
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
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
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

        <div className="mb-8 space-y-2">
          <h1 className="h1">
            Account Settings
          </h1>
          <p className="text-lead">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
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
                  {/* Profile Images */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Profile Images</Label>
                      <p className="text-sm text-muted-foreground">
                        Upload your profile images (max 5MB each)
                      </p>
                    </div>

                    {/* Avatar */}
                    <div className="space-y-2">
                      <Label htmlFor="avatar">Avatar (500x500)</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                          {avatarPreview ? (
                            <>
                              <Image
                                src={avatarPreview}
                                alt="Avatar preview"
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                              {avatarFile && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <UploadIcon className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <UploadIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <label htmlFor="avatar-upload">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingImage === 'avatar'}
                              className="cursor-pointer"
                            >
                              {uploadingImage === 'avatar' ? 'Uploading...' : 'Upload'}
                            </Button>
                            <input
                              id="avatar-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageChange(e, 'avatar')}
                              disabled={uploadingImage === 'avatar'}
                            />
                          </label>
                          {(avatarFile || avatarPreview) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveImage('avatar')}
                              disabled={uploadingImage === 'avatar'}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                      {/* Cover */}
                    <div className="space-y-2">
                      <Label htmlFor="cover">Cover Image (1500x500)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Images up to 1920x1080 can be uploaded. Drag to reposition, scroll to zoom.
                      </p>
                      <div className="flex flex-col gap-4">
                        <div
                          className="relative w-full rounded-lg overflow-hidden border-2 border-border bg-muted cursor-move"
                          style={{ aspectRatio: '3/1', maxWidth: '1500px', maxHeight: '500px' }}
                          onMouseDown={handleCoverMouseDown}
                          onWheel={handleCoverWheel}
                          onDragStart={(e) => e.preventDefault()}
                        >
                          {coverImageSrc ? (
                            <>
                              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                <img
                                  ref={coverImageRef}
                                  src={coverImageSrc}
                                  alt="Cover preview"
                                  className="select-none pointer-events-none"
                                  style={{
                                    transform: `translate(${coverPosition.x}px, ${coverPosition.y}px) scale(${coverScale})`,
                                    transition: isDraggingCover ? 'none' : 'transform 0.1s ease-out',
                                    objectFit: 'contain',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                  }}
                                  draggable={false}
                                  onLoad={(e) => {
                                    const img = e.currentTarget;
                                    const container = img.parentElement?.parentElement;
                                    if (!container) return;

                                    // Get actual container dimensions
                                    const containerWidth = container.clientWidth;
                                    const containerHeight = container.clientHeight;
                                    const containerAspect = containerWidth / containerHeight;
                                    const imgAspect = img.naturalWidth / img.naturalHeight;

                                    // Calculate initial scale to fit the image in container
                                    let initialScale = 1;
                                    if (imgAspect > containerAspect) {
                                      // Image is wider - fit to height
                                      initialScale = containerHeight / img.naturalHeight;
                                    } else {
                                      // Image is taller - fit to width
                                      initialScale = containerWidth / img.naturalWidth;
                                    }

                                    // Set image dimensions based on natural size
                                    img.style.width = `${img.naturalWidth}px`;
                                    img.style.height = `${img.naturalHeight}px`;

                                    setCoverScale(initialScale);
                                    setCoverPosition({ x: 0, y: 0 });
                                  }}
                                />
                              </div>
                              {coverFile && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
                                  <div className="bg-background/90 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                                    <MoveIcon className="h-4 w-4" />
                                    <span>Drag to reposition • Scroll to zoom</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <UploadIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingImage === 'cover'}
                          >
                            {uploadingImage === 'cover' ? 'Uploading...' : coverImageSrc ? 'Change Image' : 'Upload'}
                          </Button>
                          <input
                            ref={coverInputRef}
                            id="cover-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageChange(e, 'cover')}
                            disabled={uploadingImage === 'cover'}
                          />
                          {(coverFile || coverPreview) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleRemoveImage('cover');
                                setCoverImageSrc(null);
                                setCoverPosition({ x: 0, y: 0 });
                                setCoverScale(1);
                                if (coverInputRef.current) {
                                  coverInputRef.current.value = '';
                                }
                              }}
                              disabled={uploadingImage === 'cover'}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Banner */}
                    <div className="space-y-2">
                      <Label htmlFor="banner">Banner Image (1500x500)</Label>
                      <div className="flex flex-col gap-4">
                        <div
                          className="relative w-full rounded-lg overflow-hidden border-2 border-border bg-muted"
                          style={{ aspectRatio: '3/1', maxWidth: '1500px', maxHeight: '500px' }}
                        >
                          {bannerPreview ? (
                            <>
                              <Image
                                src={bannerPreview}
                                alt="Banner preview"
                                fill
                                sizes="(max-width: 1500px) 100vw, 1500px"
                                className="object-cover"
                              />
                              {bannerFile && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <UploadIcon className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <UploadIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bannerInputRef.current?.click()}
                            disabled={uploadingImage === 'banner'}
                          >
                            {uploadingImage === 'banner' ? 'Uploading...' : bannerImageSrc ? 'Change Image' : 'Upload'}
                          </Button>
                          <input
                            ref={bannerInputRef}
                            id="banner-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageChange(e, 'banner')}
                            disabled={uploadingImage === 'banner'}
                          />
                          {(bannerFile || bannerPreview) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleRemoveImage('banner');
                                setBannerImageSrc(null);
                                setBannerPosition({ x: 0, y: 0 });
                                setBannerScale(1);
                                if (bannerInputRef.current) {
                                  bannerInputRef.current.value = '';
                                }
                              }}
                              disabled={uploadingImage === 'banner'}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

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

          {/* Social Tab */}
          <TabsContent value="social" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
                <CardDescription>
                  Add links to your social media profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  updateProfileMutation.mutate({
                    social: {
                      twitter: socialData.twitter || undefined,
                      instagram: socialData.instagram || undefined,
                      facebook: socialData.facebook || undefined,
                      youtube: socialData.youtube || undefined,
                      discord: socialData.discord || undefined,
                      twitch: socialData.twitch || undefined,
                    },
                  });
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter / X</Label>
                      <Input
                        id="twitter"
                        type="url"
                        value={socialData.twitter}
                        onChange={(e) => setSocialData({ ...socialData, twitter: e.target.value })}
                        placeholder="https://twitter.com/username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        type="url"
                        value={socialData.instagram}
                        onChange={(e) => setSocialData({ ...socialData, instagram: e.target.value })}
                        placeholder="https://instagram.com/username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        type="url"
                        value={socialData.facebook}
                        onChange={(e) => setSocialData({ ...socialData, facebook: e.target.value })}
                        placeholder="https://facebook.com/username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input
                        id="youtube"
                        type="url"
                        value={socialData.youtube}
                        onChange={(e) => setSocialData({ ...socialData, youtube: e.target.value })}
                        placeholder="https://youtube.com/@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discord">Discord</Label>
                      <Input
                        id="discord"
                        type="url"
                        value={socialData.discord}
                        onChange={(e) => setSocialData({ ...socialData, discord: e.target.value })}
                        placeholder="https://discord.gg/username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitch">Twitch</Label>
                      <Input
                        id="twitch"
                        type="url"
                        value={socialData.twitch}
                        onChange={(e) => setSocialData({ ...socialData, twitch: e.target.value })}
                        placeholder="https://twitch.tv/username"
                      />
                    </div>

                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSocialData({
                          twitter: user.social?.twitter || '',
                          instagram: user.social?.instagram || '',
                          facebook: user.social?.facebook || '',
                          youtube: user.social?.youtube || '',
                          discord: user.social?.discord || '',
                          twitch: user.social?.twitch || '',
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
                        <Label htmlFor="isPublic">Public Profile</Label>
                        <p className="text-sm text-muted-foreground">
                          Make your profile visible to everyone
                        </p>
                      </div>
                      <Checkbox
                        id="isPublic"
                        checked={privacyData.isPublic}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, isPublic: checked === true })
                        }
                      />
                    </div>

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

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifyOnFollow">Notify on Follow</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications when someone follows you
                        </p>
                      </div>
                      <Checkbox
                        id="notifyOnFollow"
                        checked={privacyData.notifyOnFollow}
                        onCheckedChange={(checked) =>
                          setPrivacyData({ ...privacyData, notifyOnFollow: checked === true })
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
                          isPublic: user.isPublic ?? true,
                          isFollowerOnly: user.privacy?.isFollowerOnly || false,
                          isSubscriberOnly: user.privacy?.isSubscriberOnly || false,
                          isMatureContent: user.privacy?.isMatureContent || false,
                          allowMessages: user.privacy?.allowMessages ?? true,
                          allowNotifications: user.privacy?.allowNotifications ?? true,
                          allowFriendRequests: user.privacy?.allowFriendRequests ?? true,
                          notifyOnFollow: user.privacy?.notifyOnFollow ?? true,
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (user.security?.isTwoFactorEnabled) {
                            // TODO: Implement manage 2FA dialog
                            showNotification('error', '2FA management coming soon');
                          } else {
                            setTwofaDialogOpen(true);
                          }
                        }}
                      >
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

      {/* 2FA Setup/Enable Dialog */}
      <Dialog open={twofaDialogOpen} onOpenChange={setTwofaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {twofaStep === 'password' && 'Enter your password to begin setting up 2FA'}
              {twofaStep === 'qr' && 'Scan the QR code with your authenticator app'}
              {twofaStep === 'verify' && 'Enter the 6-digit code from your authenticator app'}
              {twofaStep === 'backup' && 'Save these backup codes in a safe place'}
            </DialogDescription>
          </DialogHeader>

          {twofaStep === 'password' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="twofa-password">Password</Label>
                <Input
                  id="twofa-password"
                  type="password"
                  value={twofaPassword}
                  onChange={(e) => setTwofaPassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTwofaSetup();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleTwofaDialogClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTwofaSetup}
                  disabled={setupTwofaMutation.isPending || !twofaPassword}
                >
                  {setupTwofaMutation.isPending ? 'Setting up...' : 'Continue'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {twofaStep === 'qr' && twofaSetupData && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-64 h-64 bg-white p-4 rounded-lg border-2 border-border">
                  <Image
                    src={twofaSetupData.qrCode}
                    alt="2FA QR Code"
                    fill
                    className="object-contain"
                    sizes="256px"
                  />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium">Manual Entry Key:</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                    {twofaSetupData.manualEntryKey}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then click Continue.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleTwofaDialogClose}>
                  Cancel
                </Button>
                <Button onClick={() => setTwofaStep('verify')}>
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {twofaStep === 'verify' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="twofa-code">Verification Code</Label>
                <Input
                  id="twofa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twofaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTwofaCode(value);
                  }}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && twofaCode.length === 6) {
                      handleTwofaEnable();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTwofaStep('qr')}>
                  Back
                </Button>
                <Button
                  onClick={handleTwofaEnable}
                  disabled={enableTwofaMutation.isPending || twofaCode.length !== 6}
                >
                  {enableTwofaMutation.isPending ? 'Enabling...' : 'Enable 2FA'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {twofaStep === 'backup' && twofaBackupCodes && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Important: Save these backup codes now. You won't be able to see them again.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {twofaBackupCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          showNotification('success', 'Code copied to clipboard');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const codesText = twofaBackupCodes.join('\n');
                    navigator.clipboard.writeText(codesText);
                    showNotification('success', 'All codes copied to clipboard');
                  }}
                >
                  Copy All Codes
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleTwofaDialogClose}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

