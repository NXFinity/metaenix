'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { useAuth } from '@/core/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Textarea } from '@/theme/ui/textarea';
import {
  HeartIcon,
  MessageCircleIcon,
  ArrowLeftIcon,
  Loader2,
  SendIcon,
  XIcon,
} from 'lucide-react';
import type { Comment } from '@/core/api/posts';

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

function CommentDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const commentId = params.commentId as string;
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuth();

  // Fetch the comment
  const { data: targetComment, isLoading: isLoadingComment } = useQuery({
    queryKey: ['comments', commentId],
    queryFn: () => postsService.getCommentById(commentId),
    enabled: !!commentId,
  });

  // Get postId from the comment for creating replies
  const postId = targetComment?.postId;

  // Fetch replies for this comment (only if comment has replies)
  const { data: repliesData, isLoading: isLoadingReplies } = useQuery({
    queryKey: ['comments', commentId, 'replies'],
    queryFn: () => postsService.getCommentReplies(commentId, { page: 1, limit: 100 }),
    enabled: !!commentId && !!targetComment && (targetComment.repliesCount ?? 0) > 0,
  });

  const replies = repliesData?.data || [];

  // Comment reply state
  const [replyInput, setReplyInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  // Verify username matches comment author
  useEffect(() => {
    if (targetComment?.user?.username && targetComment.user.username !== username) {
      router.replace(`/${targetComment.user.username}/posts/comment/${commentId}`);
    }
  }, [targetComment, username, commentId, router]);

  // Like/unlike comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (id: string) => {
      // Check if target comment or a reply
      const comment = id === targetComment?.id ? targetComment : replies.find((r: Comment) => r.id === id);
      if (comment?.isLiked) {
        return postsService.unlikeComment(id);
      } else {
        return postsService.likeComment(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', commentId] });
      queryClient.invalidateQueries({ queryKey: ['comments', commentId, 'replies'] });
    },
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: (content: string) => {
      if (!postId || !targetComment?.id) {
        throw new Error('Post ID or comment ID missing');
      }
      return postsService.createComment(postId, {
        content,
        parentCommentId: replyingTo?.id || targetComment.id,
      });
    },
    onSuccess: () => {
      setReplyInput('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', commentId, 'replies'] });
    },
  });

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated || likeCommentMutation.isPending) return;
    likeCommentMutation.mutate(commentId);
  };

  const handleReplyClick = (reply?: Comment) => {
    if (!isAuthenticated) return;
    setReplyingTo(reply || null);
    // Scroll to reply input
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      textarea?.focus();
    }, 100);
  };

  const handleReplySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isAuthenticated || !replyInput.trim() || createReplyMutation.isPending || !postId || !targetComment) return;
    createReplyMutation.mutate(replyInput.trim());
  };

  if (isLoadingComment || isLoadingReplies) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading comment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!targetComment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Comment Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The comment you&apos;re looking for doesn&apos;t exist or may have been deleted.
            </p>
            <Button onClick={() => router.push(`/${username}`)}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const commentAuthor = targetComment.user;
  const commentDisplayName = commentAuthor?.displayName || commentAuthor?.username || 'Unknown';
  const commentAvatar = commentAuthor?.profile?.avatar;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Back Button */}
      {postId && (
        <Button
          variant="ghost"
          onClick={() => router.push(`/${username}/posts/${postId}`)}
          className="mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to post
        </Button>
      )}

      {/* Comment Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Link href={`/${commentAuthor?.username || ''}`} className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ring-2 ring-border hover:ring-primary/50 transition-all">
                {commentAvatar ? (
                  <Image
                    src={commentAvatar}
                    alt={commentDisplayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {commentDisplayName[0].toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Link href={`/${commentAuthor?.username || ''}`}>
                    <p className="font-semibold text-foreground hover:text-primary">
                      {commentDisplayName}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(targetComment.dateCreated)}
                    {targetComment.isEdited && ' · Edited'}
                  </p>
                </div>
              </div>
              <p className="text-base whitespace-pre-wrap break-words mb-4">
                {targetComment.content}
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-red-500"
                  onClick={() => handleLikeComment(targetComment.id)}
                  disabled={!isAuthenticated || likeCommentMutation.isPending}
                >
                  <HeartIcon
                    className={`h-4 w-4 ${targetComment.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  <span>{targetComment.likesCount || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-primary"
                  onClick={() => handleReplyClick()}
                  disabled={!isAuthenticated}
                >
                  <MessageCircleIcon className="h-4 w-4" />
                  <span>Reply</span>
                </Button>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircleIcon className="h-3.5 w-3.5" />
                  <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies Section */}
      {replies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          {replies.map((reply: Comment) => (
            <Card key={reply.id} className="ml-6">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Link href={`/${reply.user?.username || ''}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                      {reply.user?.profile?.avatar ? (
                        <Image
                          src={reply.user.profile.avatar}
                          alt={reply.user.displayName || reply.user.username}
                          width={32}
                          height={32}
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
                          <p className="text-sm font-semibold text-foreground hover:text-primary">
                            {reply.user?.displayName || reply.user?.username || 'Unknown'}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(reply.dateCreated)}
                          {reply.isEdited && ' · Edited'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words mb-2">
                      {reply.content}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-red-500"
                        onClick={() => handleLikeComment(reply.id)}
                        disabled={!isAuthenticated || likeCommentMutation.isPending}
                      >
                        <HeartIcon
                          className={`h-3.5 w-3.5 ${reply.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                        />
                        <span>{reply.likesCount || 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => handleReplyClick(reply)}
                        disabled={!isAuthenticated}
                      >
                        <MessageCircleIcon className="h-3.5 w-3.5" />
                        <span>Reply</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {isAuthenticated && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleReplySubmit}>
              {replyingTo && (
                <div className="flex items-center justify-between mb-3 px-3 py-2 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Replying to <span className="font-semibold text-foreground">{replyingTo.user?.displayName || replyingTo.user?.username}</span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => setReplyingTo(null)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={replyingTo ? `Reply to ${replyingTo.user?.displayName || replyingTo.user?.username}...` : 'Write a reply...'}
                  className="min-h-[100px] resize-none"
                  disabled={createReplyMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleReplySubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!replyInput.trim() || createReplyMutation.isPending}
                  className="self-end"
                >
                  <SendIcon className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CommentDetailPage() {
  return (
    <RouteErrorBoundary>
      <CommentDetailPageContent />
    </RouteErrorBoundary>
  );
}

