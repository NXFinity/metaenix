'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { likesService } from '@/core/api/social/likes';
import { useAuth } from '@/core/hooks/useAuth';
import { useAlerts } from '@/theme/components/alerts';
import { Button } from '@/theme/ui/button';
import { Textarea } from '@/theme/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/theme/ui/tooltip';
import {
  MessageCircleIcon,
  HeartIcon,
  SendIcon,
  XIcon,
  Loader2,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
} from 'lucide-react';
import type { Comment } from '@/core/api/social/comments';

// Date formatting helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

// Reply component - replies cannot have replies, only likes
interface ReplyItemProps {
  reply: Comment;
  videoId: string;
  isAuthenticated: boolean;
  currentUserId?: string;
  onLike: (commentId: string) => void;
  onView: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  likePending: boolean;
  deletePending: boolean;
}

const ReplyItem = ({ reply, videoId, isAuthenticated, currentUserId, onLike, onView, onDelete, likePending, deletePending }: ReplyItemProps) => {
  return (
    <div className="ml-6 pl-4 border-l-2 border-muted">
      <div className="flex gap-3">
        <Link href={`/${reply.user?.username || ''}`} className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
            {reply.user?.profile?.avatar ? (
              <Image
                src={reply.user.profile.avatar}
                alt={reply.user.displayName || reply.user.username}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(reply.user?.displayName || reply.user?.username || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <Link href={`/${reply.user?.username || ''}`}>
                <p className="text-xs font-semibold text-foreground hover:text-primary">
                  {reply.user?.displayName || reply.user?.username || 'Unknown'}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(reply.dateCreated)}
                {reply.isEdited && ' · Edited'}
              </p>
            </div>
            {isAuthenticated && currentUserId === reply.userId && (
              <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(reply)}
                  disabled={deletePending}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  {deletePending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TrashIcon className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete reply</p>
              </TooltipContent>
            </Tooltip>
            )}
          </div>
          <p
            className="text-xs whitespace-pre-wrap break-words mb-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onView(reply)}
          >
            {reply.content}
          </p>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-red-500"
                  onClick={() => onLike(reply.id)}
                  disabled={!isAuthenticated || likePending}
                >
                  <HeartIcon
                    className={`h-3 w-3 mr-1 ${reply.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  <span>{reply.likesCount || 0}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{reply.isLiked ? 'Unlike' : 'Like'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface VideoCommentsProps {
  videoId: string;
  allowComments?: boolean;
  onCommentAdded?: () => void;
  limit?: number;
}

export const VideoComments = ({ videoId, allowComments = true, onCommentAdded, limit = 50 }: VideoCommentsProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { showConfirm, showError, showSuccess } = useAlerts();
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Comments query
  const { data: commentsData, isLoading: isLoadingComments, refetch: refetchComments } = useQuery({
    queryKey: ['videos', videoId, 'comments'],
    queryFn: () => videosService.getComments(videoId, { page: 1, limit }),
    enabled: allowComments !== false && !!videoId,
    retry: (failureCount, error: unknown) => {
      const httpError = error as { code?: string; response?: { status?: number } };
      if (
        httpError?.code === 'ERR_CONNECTION_REFUSED' ||
        httpError?.code === 'ECONNREFUSED' ||
        httpError?.response?.status === 403 ||
        httpError?.response?.status === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Like/Unlike comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => {
      const comment = commentsData?.data?.find((c: Comment) => c.id === commentId);
      if (comment?.isLiked) {
        return likesService.unlike('comment', commentId);
      } else {
        return likesService.like('comment', commentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', videoId, 'comments'] });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      videosService.createComment(videoId, {
        content,
        parentCommentId: replyingTo?.id,
      }),
    onSuccess: () => {
      setCommentInput('');
      setReplyingTo(null);
      refetchComments();
      // Invalidate analytics to refresh comment counts
      queryClient.invalidateQueries({ queryKey: ['videoAnalytics', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      onCommentAdded?.();
    },
    onError: (error: any) => {
      // Error handling - could add toast notification here if needed
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => videosService.deleteComment(commentId),
    onSuccess: () => {
      showSuccess('Comment deleted', 'The comment has been successfully deleted.');
      queryClient.invalidateQueries({ queryKey: ['videos', videoId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['videos', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['videoAnalytics', videoId] });
      refetchComments();
    },
    onError: (error: any) => {
      showError('Failed to delete comment', error.response?.data?.message || 'An error occurred while deleting the comment.');
    },
  });

  const handleDeleteComment = async (comment: Comment) => {
    if (!isAuthenticated || deleteCommentMutation.isPending) return;

    const confirmMessage = comment.repliesCount && comment.repliesCount > 0
      ? `Are you sure you want to delete this comment? This will also delete all ${comment.repliesCount} repl${comment.repliesCount === 1 ? 'y' : 'ies'}. This action cannot be undone.`
      : 'Are you sure you want to delete this comment? This action cannot be undone.';

    const confirmed = await showConfirm({
      title: 'Delete Comment',
      message: confirmMessage,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });

    if (confirmed) {
      deleteCommentMutation.mutate(comment.id);
    }
  };

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated || likeCommentMutation.isPending) return;
    likeCommentMutation.mutate(commentId);
  };

  const handleReplyClick = (comment: Comment) => {
    if (!isAuthenticated) return;
    setReplyingTo(comment);
    setTimeout(() => {
      document.getElementById(`comment-input-${videoId}`)?.focus();
    }, 100);
  };

  const handleCommentSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isAuthenticated || !commentInput.trim() || createCommentMutation.isPending) return;
    if (allowComments === false) return;
    createCommentMutation.mutate(commentInput.trim());
  };

  const handleViewComment = (comment: Comment) => {
    if (comment.user?.username) {
      router.push(`/${comment.user.username}/posts/comment/${comment.id}?videoId=${videoId}`);
    }
  };

  // Build recursive comment tree from comments data
  const buildCommentTree = (allComments: Comment[]): Comment[] => {
    const flattenComments = (comments: Comment[]): Comment[] => {
      const flat: Comment[] = [];
      comments.forEach((comment) => {
        const commentWithoutReplies = { ...comment };
        delete (commentWithoutReplies as any).replies;
        flat.push(commentWithoutReplies);
        if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
          flat.push(...flattenComments(comment.replies));
        }
      });
      return flat;
    };

    const allCommentsFlat = flattenComments(allComments);
    const topLevelComments = allCommentsFlat.filter((comment) => !comment.parentCommentId);
    const commentMap = new Map<string, Comment>();
    allCommentsFlat.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    const buildReplies = (commentId: string): Comment[] => {
      const replies: Comment[] = [];
      allCommentsFlat.forEach((comment) => {
        if (comment.parentCommentId === commentId) {
          const reply = commentMap.get(comment.id)!;
          reply.replies = [];
          replies.push(reply);
        }
      });
      return replies;
    };

    return topLevelComments.map((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      commentWithReplies.replies = buildReplies(comment.id);
      return commentWithReplies;
    });
  };

  const commentTree = commentsData?.data ? buildCommentTree(commentsData.data) : [];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Comments Header */}
        <div>
        <h3 className="text-lg font-semibold mb-1">
          {commentsData?.meta?.total || 0} {(commentsData?.meta?.total || 0) === 1 ? 'Comment' : 'Comments'}
        </h3>
      </div>

      {/* Comments List */}
      {isLoadingComments ? (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
          <p>Loading comments...</p>
        </div>
      ) : commentTree.length > 0 ? (
        <div className="space-y-4">
          {commentTree.map((comment) => {
            return (
              <div key={comment.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex gap-3">
                  <Link href={`/${comment.user?.username || ''}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                      {comment.user?.profile?.avatar ? (
                        <Image
                          src={comment.user.profile.avatar}
                          alt={comment.user.displayName || comment.user.username}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {(comment.user?.displayName || comment.user?.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <Link href={`/${comment.user?.username || ''}`}>
                          <p className="text-sm font-semibold text-foreground hover:text-primary">
                            {comment.user?.displayName || comment.user?.username || 'Unknown'}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(comment.dateCreated)}
                          {comment.isEdited && ' · Edited'}
                        </p>
                      </div>
                      {isAuthenticated && currentUser?.id === comment.userId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment)}
                              disabled={deleteCommentMutation.isPending}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            >
                              {deleteCommentMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <TrashIcon className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete comment</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap break-words mb-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleViewComment(comment)}
                    >
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-red-500"
                            onClick={() => handleLikeComment(comment.id)}
                            disabled={!isAuthenticated || likeCommentMutation.isPending}
                          >
                            <HeartIcon
                              className={`h-3.5 w-3.5 mr-1 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                            />
                            <span>{comment.likesCount || 0}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{comment.isLiked ? 'Unlike' : 'Like'}</p>
                        </TooltipContent>
                      </Tooltip>
                      {isAuthenticated && allowComments !== false && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                              onClick={() => handleReplyClick(comment)}
                            >
                              Reply
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reply</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {comment.repliesCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                const newExpanded = new Set(expandedReplies);
                                if (newExpanded.has(comment.id)) {
                                  newExpanded.delete(comment.id);
                                } else {
                                  newExpanded.add(comment.id);
                                }
                                setExpandedReplies(newExpanded);
                              }}
                            >
                              {expandedReplies.has(comment.id) ? (
                                <ChevronDownIcon className="h-3.5 w-3.5 mr-1" />
                              ) : (
                                <ChevronRightIcon className="h-3.5 w-3.5 mr-1" />
                              )}
                              <span>
                                {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{expandedReplies.has(comment.id) ? 'Hide replies' : 'Show replies'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Replies */}
                    {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {comment.replies.map((reply) => (
                          <ReplyItem
                            key={reply.id}
                            reply={reply}
                            videoId={videoId}
                            isAuthenticated={isAuthenticated}
                            currentUserId={currentUser?.id}
                            onLike={handleLikeComment}
                            onView={handleViewComment}
                            onDelete={handleDeleteComment}
                            likePending={likeCommentMutation.isPending}
                            deletePending={deleteCommentMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No comments yet</p>
        </div>
      )}

      {/* Comment Input */}
      {isAuthenticated && allowComments !== false && (
        <form onSubmit={handleCommentSubmit} className="border-t pt-4 mt-4">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-3 py-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">{replyingTo.user?.displayName || replyingTo.user?.username}</span>
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => setReplyingTo(null)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel reply</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              id={`comment-input-${videoId}`}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.user?.displayName || replyingTo.user?.username}...` : 'Write a comment...'}
              className="min-h-[60px] resize-none"
              disabled={createCommentMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCommentSubmit();
                }
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  disabled={!commentInput.trim() || createCommentMutation.isPending}
                  className="self-end"
                >
                  <SendIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send comment</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </form>
      )}
      </div>
    </TooltipProvider>
  );
};

