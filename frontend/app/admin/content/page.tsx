'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminContentService } from '@/core/api/security/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/theme/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/theme/ui/dropdown-menu';
import { FileText, Flag, Video, Image as ImageIcon, MoreVertical, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, ArrowLeft as ArrowLeftIcon, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAlerts } from '@/theme/components/alerts';
import type { Post } from '@/core/api/users/posts/types/post.type';
import type { Video as VideoType } from '@/core/api/users/videos/types/video.type';
import type { Photo } from '@/core/api/users/photos/types/photo.type';
import Image from 'next/image';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminContentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert } = useAlerts();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [reportStatus, setReportStatus] = useState<'pending' | 'reviewed' | 'resolved' | 'dismissed' | undefined>(undefined);
  const [selectedContent, setSelectedContent] = useState<{ type: 'post' | 'video' | 'photo'; id: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedReportToDelete, setSelectedReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/login');
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
    queryFn: () => adminContentService.getReports({ page, limit, status: reportStatus }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch reported content based on selected report
  const { data: reportedPost, isLoading: isLoadingReportedPost, error: errorReportedPost } = useQuery({
    queryKey: ['admin', 'content', 'post', selectedReport?.resourceId],
    queryFn: () => adminContentService.getPost(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'post' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  const { data: reportedVideo, isLoading: isLoadingReportedVideo, error: errorReportedVideo } = useQuery({
    queryKey: ['admin', 'content', 'video', selectedReport?.resourceId],
    queryFn: () => adminContentService.getVideo(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'video' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  const { data: reportedPhoto, isLoading: isLoadingReportedPhoto, error: errorReportedPhoto } = useQuery({
    queryKey: ['admin', 'content', 'photo', selectedReport?.resourceId],
    queryFn: () => adminContentService.getPhoto(selectedReport!.resourceId),
    enabled: !!selectedReport && selectedReport.resourceType === 'photo' && isAuthenticated && !!user && isAdmin(user.role),
    retry: false,
  });

  // Review report mutation
  const reviewReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'resolved' | 'dismissed' }) =>
      adminContentService.reviewReport(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'reports'] });
      showAlert('Report reviewed successfully', 'success');
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => adminContentService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'reports'] });
      setSelectedReport(null);
      setSelectedReportToDelete(null);
      setIsDeleteDialogOpen(false);
      showAlert('Report deleted successfully', 'success');
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: string) => adminContentService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'posts'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      showAlert('Post deleted successfully', 'success');
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => adminContentService.deleteVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'videos'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      showAlert('Video deleted successfully', 'success');
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => adminContentService.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'photos'] });
      setIsDeleteDialogOpen(false);
      setSelectedContent(null);
      showAlert('Photo deleted successfully', 'success');
    },
  });

  // Fetch posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['admin', 'content', 'posts', page, limit],
    queryFn: () => adminContentService.getPosts({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['admin', 'content', 'videos', page, limit],
    queryFn: () => adminContentService.getVideos({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch photos
  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['admin', 'content', 'photos', page, limit],
    queryFn: () => adminContentService.getPhotos({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  if (isInitializing) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <ErrorState
          title="Authentication Required"
          message="You must be logged in to access the admin content"
          onRetry={() => router.push('/login')}
        />
      </div>
    );
  }

  if (!isAdmin(user.role)) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <ErrorState
          title="Access Denied"
          message="You do not have permission to access this page"
          onRetry={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col w-full">
      {/* Header */}
      <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hover:bg-muted/80 transition-all duration-200 rounded-lg"
            >
              <Link href="/admin">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Content Moderation
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Manage content reports and moderate posts, videos, and photos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6 flex-1 min-h-0">
        <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5" />
                    Content Reports
                  </CardTitle>
                  <CardDescription>Review and manage content reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={reportStatus === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setReportStatus(undefined);
                      setSelectedReport(null);
                    }}
                  >
                    All
                  </Button>
                  <Button
                    variant={reportStatus === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setReportStatus('pending');
                      setSelectedReport(null);
                    }}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={reportStatus === 'resolved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setReportStatus('resolved');
                      setSelectedReport(null);
                    }}
                  >
                    Resolved
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingReports ? (
                <div className="p-6">
                  <LoadingSpinner />
                </div>
              ) : reports && reports.data && reports.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 h-[calc(100vh-240px)] p-6">
                  {/* Left Column: Reports List */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                      {reports.data.map((report) => (
                        <div
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedReport?.id === report.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm capitalize">{report.reason?.replace(/_/g, ' ')}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                  report.status === 'resolved' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                  report.status === 'dismissed' ? 'bg-gray-500/20 text-gray-600 dark:text-gray-400' :
                                  'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                }`}>
                                  {report.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <span className="capitalize">{report.resourceType}</span>
                                {report.reporter && (
                                  <span>• {report.reporter.username || report.reporter.displayName}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(report.dateCreated).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {reports.meta && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Showing {((reports.meta.page - 1) * reports.meta.limit) + 1} to{' '}
                          {Math.min(reports.meta.page * reports.meta.limit, reports.meta.total)} of{' '}
                          {reports.meta.total} reports
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => Math.max(1, p - 1));
                              setSelectedReport(null);
                            }}
                            disabled={!reports.meta.hasPreviousPage || page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => p + 1);
                              setSelectedReport(null);
                            }}
                            disabled={!reports.meta.hasNextPage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Report Details & Content */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    {selectedReport ? (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        {/* Report Details */}
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Report Details</h3>
                          <div className="h-px bg-border mb-4" />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
                            <p className="text-sm capitalize">{selectedReport.reason?.replace(/_/g, ' ')}</p>
                          </div>

                          {selectedReport.description && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                              <p className="text-sm whitespace-pre-wrap break-words">{selectedReport.description}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                            <span className={`text-xs px-2 py-1 rounded inline-block ${
                              selectedReport.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                              selectedReport.status === 'resolved' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                              selectedReport.status === 'dismissed' ? 'bg-gray-500/20 text-gray-600 dark:text-gray-400' :
                              'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            }`}>
                              {selectedReport.status}
                            </span>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Reported By</p>
                            <p className="text-sm">
                              {selectedReport.reporter?.username || selectedReport.reporter?.displayName || 'Unknown'}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Reported On</p>
                            <p className="text-sm">{new Date(selectedReport.dateCreated).toLocaleString()}</p>
                          </div>

                          {selectedReport.reviewedBy && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Reviewed By</p>
                              <p className="text-sm">
                                {selectedReport.reviewerInfo?.username || selectedReport.reviewerInfo?.displayName || selectedReport.reviewedBy}
                              </p>
                            </div>
                          )}

                          {selectedReport.reviewedAt && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Reviewed On</p>
                              <p className="text-sm">{new Date(selectedReport.reviewedAt).toLocaleString()}</p>
                            </div>
                          )}

                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Actions</p>
                            <div className="flex flex-col gap-2">
                              {selectedReport.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reviewReportMutation.mutate({ id: selectedReport.id, status: 'reviewed' })}
                                    disabled={reviewReportMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark as Reviewed
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reviewReportMutation.mutate({ id: selectedReport.id, status: 'resolved' })}
                                    disabled={reviewReportMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Resolve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reviewReportMutation.mutate({ id: selectedReport.id, status: 'dismissed' })}
                                    disabled={reviewReportMutation.isPending}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Dismiss
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedReportToDelete(selectedReport.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={deleteReportMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Report
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Reported Content */}
                        <div className="pt-4 border-t">
                          <h3 className="font-semibold text-lg mb-2">Reported Content</h3>
                          <div className="h-px bg-border mb-4" />

                          {selectedReport.resourceType === 'post' && (
                            <>
                              {isLoadingReportedPost ? (
                                <div className="flex items-center justify-center py-8">
                                  <LoadingSpinner />
                                </div>
                              ) : errorReportedPost ? (
                                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                                  <p className="text-sm text-destructive">
                                    Failed to load post: {errorReportedPost instanceof Error ? errorReportedPost.message : 'Unknown error'}
                                  </p>
                                </div>
                              ) : reportedPost ? (
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                                      {reportedPost.content || 'No content'}
                                    </p>
                                  </div>
                                  {(reportedPost.mediaUrl || reportedPost.mediaUrls?.length) && (
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium">Media</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {reportedPost.mediaUrls?.map((url: string, index: number) => (
                                          <div key={index} className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                              <Image
                                                src={url}
                                                alt={`Post media ${index + 1}`}
                                                fill
                                                className="object-contain"
                                                unoptimized
                                              />
                                            ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                                              <video
                                                src={url}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            ) : (
                                              <div className="flex items-center justify-center h-full">
                                                <FileText className="w-12 h-12 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {reportedPost.mediaUrl && !reportedPost.mediaUrls?.includes(reportedPost.mediaUrl) && (
                                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                            {reportedPost.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                              <Image
                                                src={reportedPost.mediaUrl}
                                                alt="Post media"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                              />
                                            ) : reportedPost.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                                              <video
                                                src={reportedPost.mediaUrl}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            ) : (
                                              <div className="flex items-center justify-center h-full">
                                                <FileText className="w-12 h-12 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-4 border-t">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedContent({ type: 'post', id: reportedPost.id });
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      disabled={deletePostMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Post
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}

                          {selectedReport.resourceType === 'video' && (
                            <>
                              {isLoadingReportedVideo ? (
                                <div className="flex items-center justify-center py-8">
                                  <LoadingSpinner />
                                </div>
                              ) : errorReportedVideo ? (
                                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                                  <p className="text-sm text-destructive">
                                    Failed to load video: {errorReportedVideo instanceof Error ? errorReportedVideo.message : 'Unknown error'}
                                  </p>
                                </div>
                              ) : reportedVideo ? (
                                <div className="space-y-4">
                                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                    {reportedVideo.videoUrl ? (
                                      <video
                                        src={reportedVideo.videoUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <Video className="w-12 h-12 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  {reportedVideo.caption && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Caption</p>
                                      <p className="text-sm whitespace-pre-wrap break-words">{reportedVideo.caption}</p>
                                    </div>
                                  )}
                                  <div className="pt-4 border-t">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedContent({ type: 'video', id: reportedVideo.id });
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      disabled={deleteVideoMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Video
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}

                          {selectedReport.resourceType === 'photo' && (
                            <>
                              {isLoadingReportedPhoto ? (
                                <div className="flex items-center justify-center py-8">
                                  <LoadingSpinner />
                                </div>
                              ) : errorReportedPhoto ? (
                                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                                  <p className="text-sm text-destructive">
                                    Failed to load photo: {errorReportedPhoto instanceof Error ? errorReportedPhoto.message : 'Unknown error'}
                                  </p>
                                </div>
                              ) : reportedPhoto ? (
                                <div className="space-y-4">
                                  <div className="relative w-full rounded-lg overflow-hidden border bg-muted" style={{ minHeight: '300px' }}>
                                    {reportedPhoto.photoUrl ? (
                                      reportedPhoto.width && reportedPhoto.height && reportedPhoto.width > 0 && reportedPhoto.height > 0 ? (
                                        <Image
                                          src={reportedPhoto.photoUrl}
                                          alt={reportedPhoto.caption || 'Reported photo'}
                                          width={reportedPhoto.width}
                                          height={reportedPhoto.height}
                                          className="object-contain max-w-full max-h-[500px]"
                                          unoptimized
                                        />
                                      ) : (
                                        <img
                                          src={reportedPhoto.photoUrl}
                                          alt={reportedPhoto.caption || 'Reported photo'}
                                          className="max-w-full max-h-[500px] object-contain"
                                        />
                                      )
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  {reportedPhoto.caption && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Caption</p>
                                      <p className="text-sm whitespace-pre-wrap break-words">{reportedPhoto.caption}</p>
                                    </div>
                                  )}
                                  <div className="pt-4 border-t">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedContent({ type: 'photo', id: reportedPhoto.id });
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      disabled={deletePhotoMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Photo
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <p className="text-sm text-muted-foreground">Select a report to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No reports</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Posts
              </CardTitle>
              <CardDescription>Manage platform posts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPosts ? (
                <div className="p-6">
                  <LoadingSpinner />
                </div>
              ) : posts && posts.data && posts.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 h-[calc(100vh-240px)] p-6">
                  {/* Left Column: Post List */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                      {posts.data.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPost?.id === post.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1 line-clamp-2">
                                {post.content?.substring(0, 150) || 'No content'}
                                {post.content && post.content.length > 150 && '...'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {post.postType && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {post.postType}
                                  </span>
                                )}
                                {(post.mediaUrl || post.mediaUrls?.length) && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    Media
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {post.user && (
                                  <span>{post.user.username || post.user.displayName}</span>
                                )}
                                <span>{new Date(post.dateCreated).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <DropdownMenu onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedContent({ type: 'post', id: post.id });
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Post
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {posts.meta && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Showing {((posts.meta.page - 1) * posts.meta.limit) + 1} to{' '}
                          {Math.min(posts.meta.page * posts.meta.limit, posts.meta.total)} of{' '}
                          {posts.meta.total} posts
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => Math.max(1, p - 1));
                              setSelectedPost(null);
                            }}
                            disabled={!posts.meta.hasPreviousPage || page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => p + 1);
                              setSelectedPost(null);
                            }}
                            disabled={!posts.meta.hasNextPage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Post Details & Media */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    {selectedPost ? (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Post Details</h3>
                          <div className="h-px bg-border mb-4" />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium whitespace-pre-wrap break-words">
                              {selectedPost.content || 'No content'}
                            </p>
                          </div>

                          {/* Media Display */}
                          {(selectedPost.mediaUrl || selectedPost.mediaUrls?.length) && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Media</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {selectedPost.mediaUrls?.map((url, index) => (
                                  <div key={index} className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <Image
                                        src={url}
                                        alt={`Post media ${index + 1}`}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                      />
                                    ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                                      <video
                                        src={url}
                                        controls
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <FileText className="w-12 h-12 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {selectedPost.mediaUrl && !selectedPost.mediaUrls?.includes(selectedPost.mediaUrl) && (
                                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                    {selectedPost.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <Image
                                        src={selectedPost.mediaUrl}
                                        alt="Post media"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                      />
                                    ) : selectedPost.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                                      <video
                                        src={selectedPost.mediaUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <FileText className="w-12 h-12 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Link Preview */}
                          {selectedPost.linkUrl && (
                            <div className="border rounded-lg p-4 bg-muted/50">
                              {selectedPost.linkImage && (
                                <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
                                  <Image
                                    src={selectedPost.linkImage}
                                    alt={selectedPost.linkTitle || 'Link preview'}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              {selectedPost.linkTitle && (
                                <h4 className="font-medium mb-1">{selectedPost.linkTitle}</h4>
                              )}
                              {selectedPost.linkDescription && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {selectedPost.linkDescription}
                                </p>
                              )}
                              <a
                                href={selectedPost.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                {selectedPost.linkUrl}
                              </a>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Author:</span>
                              <p className="font-medium">
                                {selectedPost.user?.username || selectedPost.user?.displayName || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <p className="font-medium">
                                {new Date(selectedPost.dateCreated).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Likes:</span>
                              <p className="font-medium">{selectedPost.likesCount || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Comments:</span>
                              <p className="font-medium">{selectedPost.commentsCount || 0}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Select a post from the list to view details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No posts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Videos
              </CardTitle>
              <CardDescription>Manage platform videos</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingVideos ? (
                <div className="p-6">
                  <LoadingSpinner />
                </div>
              ) : videos && videos.data && videos.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 h-[calc(100vh-240px)] p-6">
                  {/* Left Column: Video List */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                      {videos.data.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => setSelectedVideo(video)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedVideo?.id === video.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1 line-clamp-2">
                                {video.title || 'Untitled Video'}
                              </p>
                              {video.thumbnailUrl && (
                                <div className="relative w-full h-20 mb-2 rounded overflow-hidden bg-muted">
                                  <Image
                                    src={video.thumbnailUrl}
                                    alt={video.title || 'Video thumbnail'}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {video.status && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {video.status}
                                  </span>
                                )}
                                {video.duration && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toFixed(0).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {video.user && (
                                  <span>{video.user.username || video.user.displayName}</span>
                                )}
                                <span>{new Date(video.dateCreated).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <DropdownMenu onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedContent({ type: 'video', id: video.id });
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Video
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {videos.meta && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Showing {((videos.meta.page - 1) * videos.meta.limit) + 1} to{' '}
                          {Math.min(videos.meta.page * videos.meta.limit, videos.meta.total)} of{' '}
                          {videos.meta.total} videos
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => Math.max(1, p - 1));
                              setSelectedVideo(null);
                            }}
                            disabled={!videos.meta.hasPreviousPage || page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => p + 1);
                              setSelectedVideo(null);
                            }}
                            disabled={!videos.meta.hasNextPage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Video Details & Player */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    {selectedVideo ? (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Video Details</h3>
                          <div className="h-px bg-border mb-4" />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">{selectedVideo.title || 'Untitled Video'}</h4>
                            {selectedVideo.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {selectedVideo.description}
                              </p>
                            )}
                          </div>

                          {/* Video Player */}
                          {selectedVideo.videoUrl && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Video</h4>
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                <video
                                  src={selectedVideo.videoUrl}
                                  controls
                                  className="w-full h-full object-contain"
                                  poster={selectedVideo.thumbnailUrl || undefined}
                                />
                              </div>
                            </div>
                          )}

                          {/* Thumbnail */}
                          {selectedVideo.thumbnailUrl && !selectedVideo.videoUrl && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Thumbnail</h4>
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                <Image
                                  src={selectedVideo.thumbnailUrl}
                                  alt={selectedVideo.title || 'Video thumbnail'}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Author:</span>
                              <p className="font-medium">
                                {selectedVideo.user?.username || selectedVideo.user?.displayName || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <p className="font-medium">
                                {new Date(selectedVideo.dateCreated).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <p className="font-medium capitalize">{selectedVideo.status || 'Unknown'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Views:</span>
                              <p className="font-medium">{selectedVideo.viewsCount || 0}</p>
                            </div>
                            {selectedVideo.duration && (
                              <div>
                                <span className="text-muted-foreground">Duration:</span>
                                <p className="font-medium">
                                  {Math.floor(selectedVideo.duration / 60)}:{(selectedVideo.duration % 60).toFixed(0).padStart(2, '0')}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Resolution:</span>
                              <p className="font-medium">
                                {selectedVideo.width}x{selectedVideo.height}
                              </p>
                            </div>
                          </div>

                          {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Tags:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedVideo.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs bg-muted rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Select a video from the list to view details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No videos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photos
              </CardTitle>
              <CardDescription>Manage platform photos</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPhotos ? (
                <div className="p-6">
                  <LoadingSpinner />
                </div>
              ) : photos && photos.data && photos.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 h-[calc(100vh-240px)] p-6">
                  {/* Left Column: Photo List */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                      {photos.data.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => setSelectedPhoto(photo)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPhoto?.id === photo.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1 line-clamp-2">
                                {photo.title || 'Untitled Photo'}
                              </p>
                              {photo.thumbnailUrl && (
                                <div className="relative w-full h-20 mb-2 rounded overflow-hidden bg-muted">
                                  <Image
                                    src={photo.thumbnailUrl}
                                    alt={photo.title || 'Photo thumbnail'}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {photo.status && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {photo.status}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 bg-muted rounded">
                                  {photo.width}x{photo.height}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {photo.user && (
                                  <span>{photo.user.username || photo.user.displayName}</span>
                                )}
                                <span>{new Date(photo.dateCreated).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <DropdownMenu onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedContent({ type: 'photo', id: photo.id });
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Photo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {photos.meta && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Showing {((photos.meta.page - 1) * photos.meta.limit) + 1} to{' '}
                          {Math.min(photos.meta.page * photos.meta.limit, photos.meta.total)} of{' '}
                          {photos.meta.total} photos
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => Math.max(1, p - 1));
                              setSelectedPhoto(null);
                            }}
                            disabled={!photos.meta.hasPreviousPage || page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => p + 1);
                              setSelectedPhoto(null);
                            }}
                            disabled={!photos.meta.hasNextPage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Photo Details & Viewer */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    {selectedPhoto ? (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Photo Details</h3>
                          <div className="h-px bg-border mb-4" />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">{selectedPhoto.title || 'Untitled Photo'}</h4>
                            {selectedPhoto.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {selectedPhoto.description}
                              </p>
                            )}
                          </div>

                          {/* Photo Display */}
                          {selectedPhoto.imageUrl && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Photo</h4>
                              <div className="relative w-full rounded-lg overflow-hidden border bg-muted flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '500px' }}>
                                {selectedPhoto.width && selectedPhoto.height && selectedPhoto.width > 0 && selectedPhoto.height > 0 ? (
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={selectedPhoto.imageUrl}
                                      alt={selectedPhoto.title || 'Photo'}
                                      width={selectedPhoto.width}
                                      height={selectedPhoto.height}
                                      className="w-full h-full object-contain"
                                      style={{ maxHeight: '500px' }}
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={selectedPhoto.imageUrl}
                                    alt={selectedPhoto.title || 'Photo'}
                                    className="max-w-full max-h-[500px] object-contain"
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Author:</span>
                              <p className="font-medium">
                                {selectedPhoto.user?.username || selectedPhoto.user?.displayName || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <p className="font-medium">
                                {new Date(selectedPhoto.dateCreated).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <p className="font-medium capitalize">{selectedPhoto.status || 'Unknown'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Views:</span>
                              <p className="font-medium">{selectedPhoto.viewsCount || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Resolution:</span>
                              <p className="font-medium">
                                {selectedPhoto.width}x{selectedPhoto.height}
                              </p>
                            </div>
                            {selectedPhoto.fileSize && (
                              <div>
                                <span className="text-muted-foreground">File Size:</span>
                                <p className="font-medium">
                                  {(selectedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            )}
                          </div>

                          {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Tags:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedPhoto.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs bg-muted rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Select a photo from the list to view details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No photos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedReportToDelete ? 'Report' : selectedContent?.type}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {selectedReportToDelete ? 'report' : selectedContent?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedContent(null);
                setSelectedReportToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
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
              }}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

