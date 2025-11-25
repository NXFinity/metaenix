'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/core/api/admin/admin.service';
import { MainLayout } from '@/Theme/layout/MainLayout';
import {
  Heading,
  Text,
  Flex,
  Box,
  Card,
  Button,
  Tabs,
  Dialog,
  DropdownMenu,
  Badge,
  Separator,
} from '@radix-ui/themes';
import {
  FileText,
  Flag,
  Video,
  Image as ImageIcon,
  MoreVertical,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft as ArrowLeftIcon,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

interface Post {
  id: string;
  content?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  postType?: string;
  user?: { username?: string; displayName?: string };
  dateCreated: string;
  likesCount?: number;
  commentsCount?: number;
}

interface VideoType {
  id: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status?: string;
  duration?: number;
  width?: number;
  height?: number;
  user?: { username?: string; displayName?: string };
  dateCreated: string;
  viewsCount?: number;
  tags?: string[];
}

interface Photo {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  status?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  user?: { username?: string; displayName?: string };
  dateCreated: string;
  viewsCount?: number;
  tags?: string[];
}

interface Report {
  id: string;
  reason?: string;
  description?: string;
  status: string;
  resourceType: 'post' | 'video' | 'photo';
  resourceId: string;
  reporter?: { username?: string; displayName?: string };
  dateCreated: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerInfo?: { username?: string; displayName?: string };
}

export default function AdminContentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [reportStatus, setReportStatus] = useState<'pending' | 'reviewed' | 'resolved' | 'dismissed' | undefined>(undefined);
  const [selectedContent, setSelectedContent] = useState<{ type: 'post' | 'video' | 'photo'; id: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedReportToDelete, setSelectedReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/');
        return;
      }
      if (user && !isAdmin(user.role)) {
        router.push('/');
        return;
      }
    }
  }, [user, isAuthenticated, isInitializing, router]);

  // Fetch reports
  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['admin', 'content', 'reports', page, limit, reportStatus],
    queryFn: () => adminService.getReports({ page, limit, status: reportStatus }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch reported content based on selected report
  const { data: reportedPost, isLoading: isLoadingReportedPost, error: errorReportedPost } = useQuery({
    queryKey: ['admin', 'content', 'post', selectedReport?.resourceId],
    queryFn: () => adminService.getPost(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'post' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  const { data: reportedVideo, isLoading: isLoadingReportedVideo, error: errorReportedVideo } = useQuery({
    queryKey: ['admin', 'content', 'video', selectedReport?.resourceId],
    queryFn: () => adminService.getVideo(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'video' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  const { data: reportedPhoto, isLoading: isLoadingReportedPhoto, error: errorReportedPhoto } = useQuery({
    queryKey: ['admin', 'content', 'photo', selectedReport?.resourceId],
    queryFn: () => adminService.getPhoto(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'photo' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  // Review report mutation
  const reviewReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'resolved' | 'dismissed' }) =>
      adminService.reviewReport(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'reports'] });
      setSelectedReport(null);
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'reports'] });
      setSelectedReport(null);
      setSelectedReportToDelete(null);
      setIsDeleteDialogOpen(false);
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: string) => adminService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'posts'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      setSelectedPost(null);
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'videos'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      setSelectedVideo(null);
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => adminService.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'photos'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      setSelectedPhoto(null);
    },
  });

  // Fetch posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['admin', 'content', 'posts', page, limit],
    queryFn: () => adminService.getPosts({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['admin', 'content', 'videos', page, limit],
    queryFn: () => adminService.getVideos({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch photos
  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['admin', 'content', 'photos', page, limit],
    queryFn: () => adminService.getPhotos({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  if (isInitializing) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="gray">Loading...</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="red">Authentication Required</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAdmin(user.role)) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="red">Access Denied</Text>
        </Flex>
      </MainLayout>
    );
  }

  const handleDelete = () => {
    if (selectedReportToDelete) {
      deleteReportMutation.mutate(selectedReportToDelete);
    } else if (selectedContent) {
      if (selectedContent.type === 'post') {
        deletePostMutation.mutate(selectedContent.id);
      } else if (selectedContent.type === 'video') {
        deleteVideoMutation.mutate(selectedContent.id);
      } else if (selectedContent.type === 'photo') {
        deletePhotoMutation.mutate(selectedContent.id);
      }
    }
  };

  return (
    <MainLayout>
      <Box style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 120px)' }}>
        {/* Header */}
        <Flex direction="column" gap="4" mb="6">
          <Flex align="center" gap="4">
            <Button variant="ghost" size="2" asChild>
              <Link href="/admin">
                <ArrowLeftIcon size={16} style={{ marginRight: '8px' }} />
                Back to Dashboard
              </Link>
            </Button>
            <Separator orientation="vertical" style={{ height: '24px' }} />
            <Flex align="center" gap="3">
              <Box
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-3)',
                  color: 'var(--accent-9)',
                }}
              >
                <FileText size={24} />
              </Box>
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Heading size="9" weight="bold">Content Moderation</Heading>
                  <Badge color="orange" size="2">
                    <Shield size={12} style={{ marginRight: '4px' }} />
                    Admin
                  </Badge>
                </Flex>
                <Text size="3" color="gray">
                  Manage content reports and moderate posts, videos, and photos
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Separator size="4" mb="6" />

        {/* Main Content */}
        <Tabs.Root defaultValue="reports" style={{ height: 'calc(100% - 200px)' }}>
          <Tabs.List>
            <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
            <Tabs.Trigger value="posts">Posts</Tabs.Trigger>
            <Tabs.Trigger value="videos">Videos</Tabs.Trigger>
            <Tabs.Trigger value="photos">Photos</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4" style={{ height: 'calc(100% - 60px)', overflow: 'hidden' }}>
            <Tabs.Content value="reports" style={{ height: '100%' }}>
              <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <Flag size={20} />
                      <Heading size="5" weight="bold">Content Reports</Heading>
                    </Flex>
                    <Flex gap="2">
                      <Button
                        variant={reportStatus === undefined ? 'solid' : 'soft'}
                        size="2"
                        onClick={() => {
                          setReportStatus(undefined);
                          setSelectedReport(null);
                          setPage(1);
                        }}
                      >
                        All
                      </Button>
                      <Button
                        variant={reportStatus === 'pending' ? 'solid' : 'soft'}
                        size="2"
                        onClick={() => {
                          setReportStatus('pending');
                          setSelectedReport(null);
                          setPage(1);
                        }}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={reportStatus === 'resolved' ? 'solid' : 'soft'}
                        size="2"
                        onClick={() => {
                          setReportStatus('resolved');
                          setSelectedReport(null);
                          setPage(1);
                        }}
                      >
                        Resolved
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
                <Box style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {isLoadingReports ? (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="3" color="gray">Loading reports...</Text>
                    </Flex>
                  ) : reports && reports.data && reports.data.length > 0 ? (
                    <Flex gap="4" style={{ flex: 1, minHeight: 0, padding: '16px' }}>
                      {/* Left Column: Reports List */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <Box style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                          <Flex direction="column" gap="2">
                            {reports.data.map((report: Report) => (
                              <Box
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                style={{
                                  padding: '12px',
                                  border: '1px solid var(--gray-6)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor:
                                    selectedReport?.id === report.id
                                      ? 'var(--accent-3)'
                                      : 'transparent',
                                  borderColor:
                                    selectedReport?.id === report.id
                                      ? 'var(--accent-6)'
                                      : 'var(--gray-6)',
                                }}
                              >
                                <Flex direction="column" gap="1">
                                  <Flex align="center" gap="2">
                                    <Text size="2" weight="medium" style={{ textTransform: 'capitalize' }}>
                                      {report.reason?.replace(/_/g, ' ') || 'Unknown'}
                                    </Text>
                                    <Badge
                                      color={
                                        report.status === 'pending'
                                          ? 'yellow'
                                          : report.status === 'resolved'
                                          ? 'green'
                                          : report.status === 'dismissed'
                                          ? 'gray'
                                          : 'blue'
                                      }
                                      size="1"
                                    >
                                      {report.status}
                                    </Badge>
                                  </Flex>
                                  <Flex align="center" gap="2">
                                    <Text size="1" color="gray" style={{ textTransform: 'capitalize' }}>
                                      {report.resourceType}
                                    </Text>
                                    {report.reporter && (
                                      <>
                                        <Text size="1" color="gray">•</Text>
                                        <Text size="1" color="gray">
                                          {report.reporter.username || report.reporter.displayName}
                                        </Text>
                                      </>
                                    )}
                                  </Flex>
                                  <Text size="1" color="gray">
                                    {new Date(report.dateCreated).toLocaleDateString()}
                                  </Text>
                                </Flex>
                              </Box>
                            ))}
                          </Flex>
                        </Box>
                        {/* Pagination */}
                        {reports.meta && (
                          <Box
                            style={{
                              padding: '16px',
                              borderTop: '1px solid var(--gray-6)',
                              backgroundColor: 'var(--gray-2)',
                            }}
                          >
                            <Flex align="center" justify="between">
                              <Text size="2" color="gray">
                                Showing {((reports.meta.page - 1) * reports.meta.limit) + 1} to{' '}
                                {Math.min(reports.meta.page * reports.meta.limit, reports.meta.total)} of{' '}
                                {reports.meta.total} reports
                              </Text>
                              <Flex gap="2">
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                    setSelectedReport(null);
                                  }}
                                  disabled={!reports.meta.hasPreviousPage || page === 1}
                                >
                                  <ChevronLeft size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => p + 1);
                                    setSelectedReport(null);
                                  }}
                                  disabled={!reports.meta.hasNextPage}
                                >
                                  <ChevronRight size={16} />
                                </Button>
                              </Flex>
                            </Flex>
                          </Box>
                        )}
                      </Box>

                      {/* Right Column: Report Details & Content */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedReport ? (
                          <Box style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <Flex direction="column" gap="4">
                              {/* Report Details */}
                              <Box>
                                <Heading size="5" weight="bold" mb="2">
                                  Report Details
                                </Heading>
                                <Separator size="4" mb="4" />
                              </Box>

                              <Flex direction="column" gap="3">
                                <Box>
                                  <Text size="2" weight="medium" color="gray" mb="1">
                                    Reason
                                  </Text>
                                  <Text size="2" style={{ textTransform: 'capitalize' }}>
                                    {selectedReport.reason?.replace(/_/g, ' ') || 'Unknown'}
                                  </Text>
                                </Box>

                                {selectedReport.description && (
                                  <Box>
                                    <Text size="2" weight="medium" color="gray" mb="1">
                                      Description
                                    </Text>
                                    <Text size="2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                      {selectedReport.description}
                                    </Text>
                                  </Box>
                                )}

                                <Box>
                                  <Text size="2" weight="medium" color="gray" mb="1">
                                    Status
                                  </Text>
                                  <Badge
                                    color={
                                      selectedReport.status === 'pending'
                                        ? 'yellow'
                                        : selectedReport.status === 'resolved'
                                        ? 'green'
                                        : selectedReport.status === 'dismissed'
                                        ? 'gray'
                                        : 'blue'
                                    }
                                    size="2"
                                  >
                                    {selectedReport.status}
                                  </Badge>
                                </Box>

                                <Box>
                                  <Text size="2" weight="medium" color="gray" mb="1">
                                    Reported By
                                  </Text>
                                  <Text size="2">
                                    {selectedReport.reporter?.username ||
                                      selectedReport.reporter?.displayName ||
                                      'Unknown'}
                                  </Text>
                                </Box>

                                <Box>
                                  <Text size="2" weight="medium" color="gray" mb="1">
                                    Reported On
                                  </Text>
                                  <Text size="2">{new Date(selectedReport.dateCreated).toLocaleString()}</Text>
                                </Box>

                                {selectedReport.reviewedBy && (
                                  <Box>
                                    <Text size="2" weight="medium" color="gray" mb="1">
                                      Reviewed By
                                    </Text>
                                    <Text size="2">
                                      {selectedReport.reviewerInfo?.username ||
                                        selectedReport.reviewerInfo?.displayName ||
                                        selectedReport.reviewedBy}
                                    </Text>
                                  </Box>
                                )}

                                {selectedReport.reviewedAt && (
                                  <Box>
                                    <Text size="2" weight="medium" color="gray" mb="1">
                                      Reviewed On
                                    </Text>
                                    <Text size="2">{new Date(selectedReport.reviewedAt).toLocaleString()}</Text>
                                  </Box>
                                )}

                                <Separator size="4" mt="2" />

                                <Box>
                                  <Text size="2" weight="medium" mb="2">
                                    Actions
                                  </Text>
                                  <Flex direction="column" gap="2">
                                    {selectedReport.status === 'pending' && (
                                      <>
                                        <Button
                                          variant="soft"
                                          size="2"
                                          onClick={() =>
                                            reviewReportMutation.mutate({ id: selectedReport.id, status: 'reviewed' })
                                          }
                                          disabled={reviewReportMutation.isPending}
                                        >
                                          <CheckCircle size={16} style={{ marginRight: '8px' }} />
                                          Mark as Reviewed
                                        </Button>
                                        <Button
                                          variant="soft"
                                          size="2"
                                          onClick={() =>
                                            reviewReportMutation.mutate({ id: selectedReport.id, status: 'resolved' })
                                          }
                                          disabled={reviewReportMutation.isPending}
                                        >
                                          <CheckCircle size={16} style={{ marginRight: '8px' }} />
                                          Resolve
                                        </Button>
                                        <Button
                                          variant="soft"
                                          size="2"
                                          onClick={() =>
                                            reviewReportMutation.mutate({ id: selectedReport.id, status: 'dismissed' })
                                          }
                                          disabled={reviewReportMutation.isPending}
                                        >
                                          <XCircle size={16} style={{ marginRight: '8px' }} />
                                          Dismiss
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      color="red"
                                      variant="soft"
                                      size="2"
                                      onClick={() => {
                                        setSelectedReportToDelete(selectedReport.id);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      disabled={deleteReportMutation.isPending}
                                    >
                                      <Trash2 size={16} style={{ marginRight: '8px' }} />
                                      Delete Report
                                    </Button>
                                  </Flex>
                                </Box>
                              </Flex>

                              {/* Reported Content */}
                              <Separator size="4" />
                              <Box>
                                <Heading size="5" weight="bold" mb="2">
                                  Reported Content
                                </Heading>
                                <Separator size="4" mb="4" />

                                {selectedReport.resourceType === 'post' && (
                                  <>
                                    {isLoadingReportedPost ? (
                                      <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
                                        <Text size="3" color="gray">Loading post...</Text>
                                      </Flex>
                                    ) : errorReportedPost ? (
                                      <Card>
                                        <Box p="4">
                                          <Text size="2" color="red">
                                            Failed to load post:{' '}
                                            {errorReportedPost instanceof Error
                                              ? errorReportedPost.message
                                              : 'Unknown error'}
                                          </Text>
                                        </Box>
                                      </Card>
                                    ) : reportedPost ? (
                                      <Flex direction="column" gap="4">
                                        <Box>
                                          <Text size="2" weight="medium" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {reportedPost.content || 'No content'}
                                          </Text>
                                        </Box>
                                        {(reportedPost.mediaUrl || reportedPost.mediaUrls?.length) && (
                                          <Box>
                                            <Text size="2" weight="medium" mb="2">
                                              Media
                                            </Text>
                                            <Flex direction="column" gap="2">
                                              {reportedPost.mediaUrls?.map((url: string, index: number) => (
                                                <Box
                                                  key={index}
                                                  style={{
                                                    position: 'relative',
                                                    width: '100%',
                                                    aspectRatio: '16/9',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--gray-6)',
                                                    backgroundColor: 'var(--gray-2)',
                                                  }}
                                                >
                                                  {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <Image
                                                      src={url}
                                                      alt={`Post media ${index + 1}`}
                                                      fill
                                                      style={{ objectFit: 'contain' }}
                                                      unoptimized
                                                    />
                                                  ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                    <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                  ) : (
                                                    <Flex align="center" justify="center" style={{ height: '100%' }}>
                                                      <FileText size={48} style={{ color: 'var(--gray-9)' }} />
                                                    </Flex>
                                                  )}
                                                </Box>
                                              ))}
                                              {reportedPost.mediaUrl &&
                                                !reportedPost.mediaUrls?.includes(reportedPost.mediaUrl) && (
                                                  <Box
                                                    style={{
                                                      position: 'relative',
                                                      width: '100%',
                                                      aspectRatio: '16/9',
                                                      borderRadius: '8px',
                                                      overflow: 'hidden',
                                                      border: '1px solid var(--gray-6)',
                                                      backgroundColor: 'var(--gray-2)',
                                                    }}
                                                  >
                                                    {reportedPost.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                      <Image
                                                        src={reportedPost.mediaUrl}
                                                        alt="Post media"
                                                        fill
                                                        style={{ objectFit: 'contain' }}
                                                        unoptimized
                                                      />
                                                    ) : reportedPost.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                                                      <video
                                                        src={reportedPost.mediaUrl}
                                                        controls
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                      />
                                                    ) : (
                                                      <Flex align="center" justify="center" style={{ height: '100%' }}>
                                                        <FileText size={48} style={{ color: 'var(--gray-9)' }} />
                                                      </Flex>
                                                    )}
                                                  </Box>
                                                )}
                                            </Flex>
                                          </Box>
                                        )}
                                        <Separator size="4" />
                                        <Button
                                          color="red"
                                          variant="soft"
                                          size="2"
                                          onClick={() => {
                                            setSelectedContent({ type: 'post', id: reportedPost.id });
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          disabled={deletePostMutation.isPending}
                                        >
                                          <Trash2 size={16} style={{ marginRight: '8px' }} />
                                          Delete Post
                                        </Button>
                                      </Flex>
                                    ) : null}
                                  </>
                                )}

                                {selectedReport.resourceType === 'video' && (
                                  <>
                                    {isLoadingReportedVideo ? (
                                      <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
                                        <Text size="3" color="gray">Loading video...</Text>
                                      </Flex>
                                    ) : errorReportedVideo ? (
                                      <Card>
                                        <Box p="4">
                                          <Text size="2" color="red">
                                            Failed to load video:{' '}
                                            {errorReportedVideo instanceof Error
                                              ? errorReportedVideo.message
                                              : 'Unknown error'}
                                          </Text>
                                        </Box>
                                      </Card>
                                    ) : reportedVideo ? (
                                      <Flex direction="column" gap="4">
                                        {reportedVideo.videoUrl && (
                                          <Box
                                            style={{
                                              position: 'relative',
                                              width: '100%',
                                              aspectRatio: '16/9',
                                              borderRadius: '8px',
                                              overflow: 'hidden',
                                              border: '1px solid var(--gray-6)',
                                              backgroundColor: 'var(--gray-2)',
                                            }}
                                          >
                                            <video
                                              src={reportedVideo.videoUrl}
                                              controls
                                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                              poster={reportedVideo.thumbnailUrl || undefined}
                                            />
                                          </Box>
                                        )}
                                        {reportedVideo.caption && (
                                          <Box>
                                            <Text size="2" weight="medium" color="gray" mb="1">
                                              Caption
                                            </Text>
                                            <Text size="2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                              {reportedVideo.caption}
                                            </Text>
                                          </Box>
                                        )}
                                        <Separator size="4" />
                                        <Button
                                          color="red"
                                          variant="soft"
                                          size="2"
                                          onClick={() => {
                                            setSelectedContent({ type: 'video', id: reportedVideo.id });
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          disabled={deleteVideoMutation.isPending}
                                        >
                                          <Trash2 size={16} style={{ marginRight: '8px' }} />
                                          Delete Video
                                        </Button>
                                      </Flex>
                                    ) : null}
                                  </>
                                )}

                                {selectedReport.resourceType === 'photo' && (
                                  <>
                                    {isLoadingReportedPhoto ? (
                                      <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
                                        <Text size="3" color="gray">Loading photo...</Text>
                                      </Flex>
                                    ) : errorReportedPhoto ? (
                                      <Card>
                                        <Box p="4">
                                          <Text size="2" color="red">
                                            Failed to load photo:{' '}
                                            {errorReportedPhoto instanceof Error
                                              ? errorReportedPhoto.message
                                              : 'Unknown error'}
                                          </Text>
                                        </Box>
                                      </Card>
                                    ) : reportedPhoto ? (
                                      <Flex direction="column" gap="4">
                                        {(reportedPhoto.imageUrl || reportedPhoto.photoUrl) && (
                                          <Box
                                            style={{
                                              position: 'relative',
                                              width: '100%',
                                              minHeight: '300px',
                                              maxHeight: '500px',
                                              borderRadius: '8px',
                                              overflow: 'hidden',
                                              border: '1px solid var(--gray-6)',
                                              backgroundColor: 'var(--gray-2)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            {(reportedPhoto.width && reportedPhoto.height && reportedPhoto.width > 0 && reportedPhoto.height > 0) ? (
                                              <Image
                                                src={reportedPhoto.imageUrl || reportedPhoto.photoUrl || ''}
                                                alt={reportedPhoto.caption || 'Reported photo'}
                                                width={reportedPhoto.width}
                                                height={reportedPhoto.height}
                                                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                                                unoptimized
                                              />
                                            ) : (
                                              <img
                                                src={reportedPhoto.imageUrl || reportedPhoto.photoUrl || ''}
                                                alt={reportedPhoto.caption || 'Reported photo'}
                                                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                                              />
                                            )}
                                          </Box>
                                        )}
                                        {reportedPhoto.caption && (
                                          <Box>
                                            <Text size="2" weight="medium" color="gray" mb="1">
                                              Caption
                                            </Text>
                                            <Text size="2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                              {reportedPhoto.caption}
                                            </Text>
                                          </Box>
                                        )}
                                        <Separator size="4" />
                                        <Button
                                          color="red"
                                          variant="soft"
                                          size="2"
                                          onClick={() => {
                                            setSelectedContent({ type: 'photo', id: reportedPhoto.id });
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          disabled={deletePhotoMutation.isPending}
                                        >
                                          <Trash2 size={16} style={{ marginRight: '8px' }} />
                                          Delete Photo
                                        </Button>
                                      </Flex>
                                    ) : null}
                                  </>
                                )}
                              </Box>
                            </Flex>
                          </Box>
                        ) : (
                          <Flex align="center" justify="center" style={{ flex: 1 }}>
                            <Text size="2" color="gray">Select a report to view details</Text>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  ) : (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="2" color="gray">No reports</Text>
                    </Flex>
                  )}
                </Box>
              </Card>
            </Tabs.Content>

            {/* Posts Tab - Similar structure but simplified for space */}
            <Tabs.Content value="posts" style={{ height: '100%' }}>
              <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
                  <Flex align="center" gap="2">
                    <FileText size={20} />
                    <Heading size="5" weight="bold">Posts</Heading>
                  </Flex>
                </Box>
                <Box style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {isLoadingPosts ? (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="3" color="gray">Loading posts...</Text>
                    </Flex>
                  ) : posts && posts.data && posts.data.length > 0 ? (
                    <Flex gap="4" style={{ flex: 1, minHeight: 0, padding: '16px' }}>
                      {/* Left: Post List */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <Box style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                          <Flex direction="column" gap="2">
                            {posts.data.map((post: Post) => (
                              <Box
                                key={post.id}
                                onClick={() => setSelectedPost(post)}
                                style={{
                                  padding: '12px',
                                  border: '1px solid var(--gray-6)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor:
                                    selectedPost?.id === post.id ? 'var(--accent-3)' : 'transparent',
                                  borderColor:
                                    selectedPost?.id === post.id ? 'var(--accent-6)' : 'var(--gray-6)',
                                }}
                              >
                                <Text size="2" weight="medium" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {post.content?.substring(0, 150) || 'No content'}
                                  {post.content && post.content.length > 150 && '...'}
                                </Text>
                                <Flex align="center" gap="2" mt="2">
                                  {post.user && (
                                    <Text size="1" color="gray">
                                      {post.user.username || post.user.displayName}
                                    </Text>
                                  )}
                                  <Text size="1" color="gray">
                                    {new Date(post.dateCreated).toLocaleDateString()}
                                  </Text>
                                </Flex>
                              </Box>
                            ))}
                          </Flex>
                        </Box>
                        {posts.meta && (
                          <Box
                            style={{
                              padding: '16px',
                              borderTop: '1px solid var(--gray-6)',
                              backgroundColor: 'var(--gray-2)',
                            }}
                          >
                            <Flex align="center" justify="between">
                              <Text size="2" color="gray">
                                Page {posts.meta.page} of {posts.meta.totalPages}
                              </Text>
                              <Flex gap="2">
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                    setSelectedPost(null);
                                  }}
                                  disabled={!posts.meta.hasPreviousPage || page === 1}
                                >
                                  <ChevronLeft size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => p + 1);
                                    setSelectedPost(null);
                                  }}
                                  disabled={!posts.meta.hasNextPage}
                                >
                                  <ChevronRight size={16} />
                                </Button>
                              </Flex>
                            </Flex>
                          </Box>
                        )}
                      </Box>

                      {/* Right: Post Details */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedPost ? (
                          <Box style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <Flex direction="column" gap="4">
                              <Text size="2" weight="medium" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {selectedPost.content || 'No content'}
                              </Text>
                              {(selectedPost.mediaUrl || selectedPost.mediaUrls?.length) && (
                                <Box>
                                  <Text size="2" weight="medium" mb="2">
                                    Media
                                  </Text>
                                  <Flex direction="column" gap="2">
                                    {selectedPost.mediaUrls?.map((url, index) => (
                                      <Box
                                        key={index}
                                        style={{
                                          position: 'relative',
                                          width: '100%',
                                          aspectRatio: '16/9',
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          border: '1px solid var(--gray-6)',
                                          backgroundColor: 'var(--gray-2)',
                                        }}
                                      >
                                        {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                          <Image
                                            src={url}
                                            alt={`Post media ${index + 1}`}
                                            fill
                                            style={{ objectFit: 'contain' }}
                                            unoptimized
                                          />
                                        ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                                          <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                          <Flex align="center" justify="center" style={{ height: '100%' }}>
                                            <FileText size={48} style={{ color: 'var(--gray-9)' }} />
                                          </Flex>
                                        )}
                                      </Box>
                                    ))}
                                  </Flex>
                                </Box>
                              )}
                              <Separator size="4" />
                              <Button
                                color="red"
                                variant="soft"
                                size="2"
                                onClick={() => {
                                  setSelectedContent({ type: 'post', id: selectedPost.id });
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={deletePostMutation.isPending}
                              >
                                <Trash2 size={16} style={{ marginRight: '8px' }} />
                                Delete Post
                              </Button>
                            </Flex>
                          </Box>
                        ) : (
                          <Flex align="center" justify="center" style={{ flex: 1 }}>
                            <Text size="2" color="gray">Select a post to view details</Text>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  ) : (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="2" color="gray">No posts</Text>
                    </Flex>
                  )}
                </Box>
              </Card>
            </Tabs.Content>

            {/* Videos Tab - Similar structure */}
            <Tabs.Content value="videos" style={{ height: '100%' }}>
              <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
                  <Flex align="center" gap="2">
                    <Video size={20} />
                    <Heading size="5" weight="bold">Videos</Heading>
                  </Flex>
                </Box>
                <Box style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {isLoadingVideos ? (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="3" color="gray">Loading videos...</Text>
                    </Flex>
                  ) : videos && videos.data && videos.data.length > 0 ? (
                    <Flex gap="4" style={{ flex: 1, minHeight: 0, padding: '16px' }}>
                      {/* Left: Video List */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <Box style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                          <Flex direction="column" gap="2">
                            {videos.data.map((video: VideoType) => (
                              <Box
                                key={video.id}
                                onClick={() => setSelectedVideo(video)}
                                style={{
                                  padding: '12px',
                                  border: '1px solid var(--gray-6)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor:
                                    selectedVideo?.id === video.id ? 'var(--accent-3)' : 'transparent',
                                  borderColor:
                                    selectedVideo?.id === video.id ? 'var(--accent-6)' : 'var(--gray-6)',
                                }}
                              >
                                <Text size="2" weight="medium" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {video.title || 'Untitled Video'}
                                </Text>
                                {video.thumbnailUrl && (
                                  <Box
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '80px',
                                      marginTop: '8px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      backgroundColor: 'var(--gray-2)',
                                    }}
                                  >
                                    <Image
                                      src={video.thumbnailUrl}
                                      alt={video.title || 'Video thumbnail'}
                                      fill
                                      style={{ objectFit: 'cover' }}
                                      unoptimized
                                    />
                                  </Box>
                                )}
                                <Flex align="center" gap="2" mt="2">
                                  {video.user && (
                                    <Text size="1" color="gray">
                                      {video.user.username || video.user.displayName}
                                    </Text>
                                  )}
                                  <Text size="1" color="gray">
                                    {new Date(video.dateCreated).toLocaleDateString()}
                                  </Text>
                                </Flex>
                              </Box>
                            ))}
                          </Flex>
                        </Box>
                        {videos.meta && (
                          <Box
                            style={{
                              padding: '16px',
                              borderTop: '1px solid var(--gray-6)',
                              backgroundColor: 'var(--gray-2)',
                            }}
                          >
                            <Flex align="center" justify="between">
                              <Text size="2" color="gray">
                                Page {videos.meta.page} of {videos.meta.totalPages}
                              </Text>
                              <Flex gap="2">
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                    setSelectedVideo(null);
                                  }}
                                  disabled={!videos.meta.hasPreviousPage || page === 1}
                                >
                                  <ChevronLeft size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => p + 1);
                                    setSelectedVideo(null);
                                  }}
                                  disabled={!videos.meta.hasNextPage}
                                >
                                  <ChevronRight size={16} />
                                </Button>
                              </Flex>
                            </Flex>
                          </Box>
                        )}
                      </Box>

                      {/* Right: Video Details */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedVideo ? (
                          <Box style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <Flex direction="column" gap="4">
                              <Text size="3" weight="bold">{selectedVideo.title || 'Untitled Video'}</Text>
                              {selectedVideo.description && (
                                <Text size="2" color="gray" style={{ whiteSpace: 'pre-wrap' }}>
                                  {selectedVideo.description}
                                </Text>
                              )}
                              {selectedVideo.videoUrl && (
                                <Box
                                  style={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--gray-6)',
                                    backgroundColor: 'var(--gray-2)',
                                  }}
                                >
                                  <video
                                    src={selectedVideo.videoUrl}
                                    controls
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    poster={selectedVideo.thumbnailUrl || undefined}
                                  />
                                </Box>
                              )}
                              <Separator size="4" />
                              <Button
                                color="red"
                                variant="soft"
                                size="2"
                                onClick={() => {
                                  setSelectedContent({ type: 'video', id: selectedVideo.id });
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={deleteVideoMutation.isPending}
                              >
                                <Trash2 size={16} style={{ marginRight: '8px' }} />
                                Delete Video
                              </Button>
                            </Flex>
                          </Box>
                        ) : (
                          <Flex align="center" justify="center" style={{ flex: 1 }}>
                            <Text size="2" color="gray">Select a video to view details</Text>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  ) : (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="2" color="gray">No videos</Text>
                    </Flex>
                  )}
                </Box>
              </Card>
            </Tabs.Content>

            {/* Photos Tab - Similar structure */}
            <Tabs.Content value="photos" style={{ height: '100%' }}>
              <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
                  <Flex align="center" gap="2">
                    <ImageIcon size={20} />
                    <Heading size="5" weight="bold">Photos</Heading>
                  </Flex>
                </Box>
                <Box style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {isLoadingPhotos ? (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="3" color="gray">Loading photos...</Text>
                    </Flex>
                  ) : photos && photos.data && photos.data.length > 0 ? (
                    <Flex gap="4" style={{ flex: 1, minHeight: 0, padding: '16px' }}>
                      {/* Left: Photo List */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <Box style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                          <Flex direction="column" gap="2">
                            {photos.data.map((photo: Photo) => (
                              <Box
                                key={photo.id}
                                onClick={() => setSelectedPhoto(photo)}
                                style={{
                                  padding: '12px',
                                  border: '1px solid var(--gray-6)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor:
                                    selectedPhoto?.id === photo.id ? 'var(--accent-3)' : 'transparent',
                                  borderColor:
                                    selectedPhoto?.id === photo.id ? 'var(--accent-6)' : 'var(--gray-6)',
                                }}
                              >
                                <Text size="2" weight="medium" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {photo.title || 'Untitled Photo'}
                                </Text>
                                {(photo.thumbnailUrl || photo.imageUrl || photo.photoUrl) && (
                                  <Box
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '80px',
                                      marginTop: '8px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      backgroundColor: 'var(--gray-2)',
                                    }}
                                  >
                                    <Image
                                      src={photo.thumbnailUrl || photo.imageUrl || photo.photoUrl || ''}
                                      alt={photo.title || 'Photo thumbnail'}
                                      fill
                                      style={{ objectFit: 'cover' }}
                                      unoptimized
                                    />
                                  </Box>
                                )}
                                <Flex align="center" gap="2" mt="2">
                                  {photo.user && (
                                    <Text size="1" color="gray">
                                      {photo.user.username || photo.user.displayName}
                                    </Text>
                                  )}
                                  <Text size="1" color="gray">
                                    {new Date(photo.dateCreated).toLocaleDateString()}
                                  </Text>
                                </Flex>
                              </Box>
                            ))}
                          </Flex>
                        </Box>
                        {photos.meta && (
                          <Box
                            style={{
                              padding: '16px',
                              borderTop: '1px solid var(--gray-6)',
                              backgroundColor: 'var(--gray-2)',
                            }}
                          >
                            <Flex align="center" justify="between">
                              <Text size="2" color="gray">
                                Page {photos.meta.page} of {photos.meta.totalPages}
                              </Text>
                              <Flex gap="2">
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                    setSelectedPhoto(null);
                                  }}
                                  disabled={!photos.meta.hasPreviousPage || page === 1}
                                >
                                  <ChevronLeft size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="2"
                                  onClick={() => {
                                    setPage((p) => p + 1);
                                    setSelectedPhoto(null);
                                  }}
                                  disabled={!photos.meta.hasNextPage}
                                >
                                  <ChevronRight size={16} />
                                </Button>
                              </Flex>
                            </Flex>
                          </Box>
                        )}
                      </Box>

                      {/* Right: Photo Details */}
                      <Box
                        style={{
                          width: '50%',
                          border: '1px solid var(--gray-6)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedPhoto ? (
                          <Box style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <Flex direction="column" gap="4">
                              <Text size="3" weight="bold">{selectedPhoto.title || 'Untitled Photo'}</Text>
                              {selectedPhoto.description && (
                                <Text size="2" color="gray" style={{ whiteSpace: 'pre-wrap' }}>
                                  {selectedPhoto.description}
                                </Text>
                              )}
                              {(selectedPhoto.imageUrl || selectedPhoto.photoUrl) && (
                                <Box
                                  style={{
                                    position: 'relative',
                                    width: '100%',
                                    minHeight: '300px',
                                    maxHeight: '500px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--gray-6)',
                                    backgroundColor: 'var(--gray-2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {(selectedPhoto.width && selectedPhoto.height && selectedPhoto.width > 0 && selectedPhoto.height > 0) ? (
                                    <Image
                                      src={selectedPhoto.imageUrl || selectedPhoto.photoUrl || ''}
                                      alt={selectedPhoto.title || 'Photo'}
                                      width={selectedPhoto.width}
                                      height={selectedPhoto.height}
                                      style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                                      unoptimized
                                    />
                                  ) : (
                                    <img
                                      src={selectedPhoto.imageUrl || selectedPhoto.photoUrl || ''}
                                      alt={selectedPhoto.title || 'Photo'}
                                      style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                                    />
                                  )}
                                </Box>
                              )}
                              <Separator size="4" />
                              <Button
                                color="red"
                                variant="soft"
                                size="2"
                                onClick={() => {
                                  setSelectedContent({ type: 'photo', id: selectedPhoto.id });
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={deletePhotoMutation.isPending}
                              >
                                <Trash2 size={16} style={{ marginRight: '8px' }} />
                                Delete Photo
                              </Button>
                            </Flex>
                          </Box>
                        ) : (
                          <Flex align="center" justify="center" style={{ flex: 1 }}>
                            <Text size="2" color="gray">Select a photo to view details</Text>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  ) : (
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                      <Text size="2" color="gray">No photos</Text>
                    </Flex>
                  )}
                </Box>
              </Card>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>

      {/* Delete Dialog */}
      <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Content style={{ maxWidth: '500px' }}>
          <Dialog.Title>
            Delete {selectedReportToDelete ? 'Report' : selectedContent?.type}
          </Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete this {selectedReportToDelete ? 'report' : selectedContent?.type}? This
            action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button
                variant="soft"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedContent(null);
                  setSelectedReportToDelete(null);
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={handleDelete}
              disabled={
                deleteReportMutation.isPending ||
                deletePostMutation.isPending ||
                deleteVideoMutation.isPending ||
                deletePhotoMutation.isPending
              }
            >
              {deleteReportMutation.isPending ||
              deletePostMutation.isPending ||
              deleteVideoMutation.isPending ||
              deletePhotoMutation.isPending
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </MainLayout>
  );
}
