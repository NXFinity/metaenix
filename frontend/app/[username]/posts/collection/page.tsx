'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/hooks/useAuth';
import { postsService } from '@/core/api/users/posts';
import { storageService } from '@/core/api/storage/storage.service';
import { StorageType } from '@/core/api/storage/types/storage.type';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Textarea } from '@/theme/ui/textarea';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
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
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { EmptyState } from '@/theme/components/empty/EmptyState';
import { PostCard } from '@/theme/components/posts/Posts';
import {
  FolderPlusIcon,
  FolderIcon,
  PlusIcon,
  ChevronLeft,
  ChevronRight,
  SearchIcon,
  GlobeIcon,
  LockIcon,
  ImageIcon,
  XIcon,
  EditIcon,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';
import type { CreateCollectionRequest, UpdateCollectionRequest, Collection } from '@/core/api/users/posts';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function CollectionsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateCollectionRequest>({
    name: '',
    description: '',
    isPublic: false,
    coverImage: '',
  });
  const [editFormData, setEditFormData] = useState<UpdateCollectionRequest>({
    name: '',
    description: '',
    isPublic: false,
    coverImage: '',
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [editCoverImageFile, setEditCoverImageFile] = useState<File | null>(null);
  const [editCoverImagePreview, setEditCoverImagePreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const editCoverImageInputRef = useRef<HTMLInputElement>(null);

  // Fetch all collections
  const {
    data: collectionsData,
    isLoading: isLoadingCollections,
    error: collectionsError,
  } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => postsService.getCollections({ page: 1, limit: 50 }),
    enabled: !!user?.id && !selectedCollectionId,
  });

  // Redirect if not authenticated or wrong user
  if (!isInitializing && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (!isInitializing && isAuthenticated && user && user.username !== username) {
    router.push(`/${user.username}/posts/collection`);
    return null;
  }

  // Fetch posts in selected collection
  const {
    data: collectionPostsData,
    isLoading: isLoadingCollectionPosts,
    error: collectionPostsError,
  } = useQuery({
    queryKey: ['collectionPosts', selectedCollectionId],
    queryFn: () => postsService.getCollectionPosts(selectedCollectionId!, { page: 1, limit: 20 }),
    enabled: !!selectedCollectionId,
  });

  // Handle cover image file selection
  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setCoverImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  // Handle edit cover image file selection
  const handleEditCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setEditCoverImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveEditCoverImage = () => {
    setEditCoverImageFile(null);
    setEditCoverImagePreview(null);
    if (editCoverImageInputRef.current) {
      editCoverImageInputRef.current.value = '';
    }
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setEditFormData({
      name: collection.name,
      description: collection.description || '',
      isPublic: collection.isPublic,
      coverImage: collection.coverImage || '',
    });
    setEditCoverImageFile(null);
    setEditCoverImagePreview(null);
    setIsEditDialogOpen(true);
  };

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: CreateCollectionRequest) => {
      let coverImageUrl = data.coverImage;

      // Upload cover image if a file is selected
      if (coverImageFile) {
        setIsUploadingCover(true);
        try {
          const uploadResponse = await storageService.upload({
            file: coverImageFile,
            storageType: StorageType.MEDIA,
            subType: 'photo',
          });
          coverImageUrl = uploadResponse.url;
        } catch (error) {
          console.error('Failed to upload cover image:', error);
          throw new Error('Failed to upload cover image');
        } finally {
          setIsUploadingCover(false);
        }
      }

      // Remove empty strings and convert to undefined for optional fields
      const payload: CreateCollectionRequest = {
        name: data.name.trim(),
        ...(data.description?.trim() ? { description: data.description.trim() } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(coverImageUrl ? { coverImage: coverImageUrl } : {}),
      };
      return postsService.createCollection(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setIsCreateDialogOpen(false);
      setCreateFormData({ name: '', description: '', isPublic: false, coverImage: '' });
      setCoverImageFile(null);
      setCoverImagePreview(null);
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
      // Optionally select the newly created collection
      if (response.collection?.id) {
        setSelectedCollectionId(response.collection.id);
      }
    },
  });

  const handleCreateCollection = () => {
    if (!createFormData.name.trim()) return;
    createCollectionMutation.mutate(createFormData);
  };

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async (data: UpdateCollectionRequest) => {
      let coverImageUrl = data.coverImage;

      // Upload cover image if a new file is selected
      if (editCoverImageFile) {
        setIsUploadingEditCover(true);
        try {
          const uploadResponse = await storageService.upload({
            file: editCoverImageFile,
            storageType: StorageType.MEDIA,
            subType: 'photo',
          });
          coverImageUrl = uploadResponse.url;
        } catch (error) {
          console.error('Failed to upload cover image:', error);
          throw new Error('Failed to upload cover image');
        } finally {
          setIsUploadingEditCover(false);
        }
      }

      // Remove empty strings and convert to undefined for optional fields
      const payload: UpdateCollectionRequest = {
        ...(data.name?.trim() ? { name: data.name.trim() } : {}),
        ...(data.description?.trim() ? { description: data.description.trim() } : data.description === '' ? { description: null } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(coverImageUrl ? { coverImage: coverImageUrl } : coverImageUrl === '' ? { coverImage: null } : {}),
      };
      
      if (!editingCollection) throw new Error('No collection selected for editing');
      return postsService.updateCollection(editingCollection.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collectionPosts', selectedCollectionId] });
      setIsEditDialogOpen(false);
      setEditingCollection(null);
      setEditFormData({ name: '', description: '', isPublic: false, coverImage: '' });
      setEditCoverImageFile(null);
      setEditCoverImagePreview(null);
      if (editCoverImageInputRef.current) {
        editCoverImageInputRef.current.value = '';
      }
    },
  });

  const handleUpdateCollection = () => {
    if (!editFormData.name?.trim()) return;
    updateCollectionMutation.mutate(editFormData);
  };

  const collectionPosts = collectionPostsData?.data || [];
  const meta = collectionPostsData?.meta;

  if (isInitializing || !user || user.username !== username) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FolderIcon className="h-8 w-8 text-primary" />
            <h1 className="h1">Post Collections</h1>
          </div>
          <p className="text-lead">
            Organize your posts into collections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/${username}/posts`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Posts
            </Link>
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {!selectedCollectionId ? (
        <>
          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : collectionsError ? (
            <ErrorState
              title="Failed to Load Collections"
              description={collectionsError instanceof Error ? collectionsError.message : 'An error occurred'}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ['collections', user?.id] })}
            />
          ) : !collectionsData?.data || collectionsData.data.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Collections</CardTitle>
                <CardDescription>
                  Create a collection to organize your posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="No Collections Yet"
                  description="Create your first collection to start organizing your posts"
                  icon={<FolderIcon className="h-12 w-12 text-muted-foreground" />}
                  action={{
                    label: 'Create Collection',
                    onClick: () => setIsCreateDialogOpen(true),
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Collections</CardTitle>
                  <CardDescription>
                    {collectionsData.meta?.total ? `${collectionsData.meta.total} collection${collectionsData.meta.total !== 1 ? 's' : ''}` : 'Organize your posts'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collectionsData.data.map((collection) => (
                      <Card
                        key={collection.id}
                        className="hover:shadow-lg transition-all duration-300 group relative"
                      >
                        <div
                          className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 cursor-pointer"
                          onClick={() => setSelectedCollectionId(collection.id)}
                        >
                          {collection.coverImage ? (
                            <Image
                              src={collection.coverImage}
                              alt={collection.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FolderIcon className="h-12 w-12 text-primary/40" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            {collection.isPublic ? (
                              <GlobeIcon className="h-4 w-4 text-foreground/60 bg-background/80 rounded-full p-1" />
                            ) : (
                              <LockIcon className="h-4 w-4 text-foreground/60 bg-background/80 rounded-full p-1" />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditCollection(collection)}>
                                  <EditIcon className="h-4 w-4 mr-2" />
                                  Edit Collection
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3
                            className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors cursor-pointer"
                            onClick={() => setSelectedCollectionId(collection.id)}
                          >
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {collection.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{collection.postsCount} post{collection.postsCount !== 1 ? 's' : ''}</span>
                            <span className="text-xs">
                              {new Date(collection.dateCreated).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Collection Posts */}
          {isLoadingCollectionPosts ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : collectionPostsError ? (
            <ErrorState
              title="Failed to Load Collection Posts"
              description={collectionPostsError instanceof Error ? collectionPostsError.message : 'An error occurred'}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ['collectionPosts', selectedCollectionId] })}
            />
          ) : collectionPosts.length === 0 ? (
            <EmptyState
              title="No Posts in Collection"
              description="Add posts to this collection to see them here"
              icon={<FolderIcon className="h-12 w-12 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="h2">Collection Posts</h2>
                  <p className="text-muted-foreground">
                    {meta?.total ? `${meta.total} post${meta.total !== 1 ? 's' : ''}` : 'Posts in collection'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedCollectionId(null)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Collections
                </Button>
              </div>

              <div className="space-y-4">
                {collectionPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {meta.page} of {meta.totalPages} • {meta.total} total posts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page === 1}
                      onClick={() => {
                        // TODO: Implement pagination
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page === meta.totalPages}
                      onClick={() => {
                        // TODO: Implement pagination
                      }}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your posts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name *</Label>
              <Input
                id="name"
                placeholder="My Favorite Posts"
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A collection of my favorite posts..."
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, description: e.target.value })
                }
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image</Label>
              {coverImagePreview ? (
                <div className="relative">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border">
                    <Image
                      src={coverImagePreview}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveCoverImage}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    id="coverImage"
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverImageInputRef.current?.click()}
                    className="w-full"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Cover Image
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={createFormData.isPublic}
                onCheckedChange={(checked) =>
                  setCreateFormData({ ...createFormData, isPublic: checked === true })
                }
              />
              <Label htmlFor="isPublic" className="flex items-center gap-2 cursor-pointer">
                {createFormData.isPublic ? (
                  <GlobeIcon className="h-4 w-4" />
                ) : (
                  <LockIcon className="h-4 w-4" />
                )}
                Public collection
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createCollectionMutation.isPending || isUploadingCover}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={createCollectionMutation.isPending || isUploadingCover || !createFormData.name.trim()}
            >
              {isUploadingCover ? 'Uploading...' : createCollectionMutation.isPending ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update your collection information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Collection Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Favorite Posts"
                value={editFormData.name || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="A collection of my favorite posts..."
                value={editFormData.description || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, description: e.target.value })
                }
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-coverImage">Cover Image</Label>
              {editCoverImagePreview ? (
                <div className="relative">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border">
                    <Image
                      src={editCoverImagePreview}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveEditCoverImage}
                  >
                    Remove
                  </Button>
                </div>
              ) : editingCollection?.coverImage ? (
                <div className="relative">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border">
                    <Image
                      src={editingCollection.coverImage}
                      alt="Current cover"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setEditFormData({ ...editFormData, coverImage: '' });
                    }}
                  >
                    Remove Current
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    ref={editCoverImageInputRef}
                    type="file"
                    id="edit-coverImage"
                    accept="image/*"
                    onChange={handleEditCoverImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editCoverImageInputRef.current?.click()}
                    className="w-full"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Cover Image
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isPublic"
                checked={editFormData.isPublic}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isPublic: checked === true })
                }
              />
              <Label htmlFor="edit-isPublic" className="flex items-center gap-2 cursor-pointer">
                {editFormData.isPublic ? (
                  <GlobeIcon className="h-4 w-4" />
                ) : (
                  <LockIcon className="h-4 w-4" />
                )}
                Public collection
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateCollectionMutation.isPending || isUploadingEditCover}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCollection}
              disabled={updateCollectionMutation.isPending || isUploadingEditCover || !editFormData.name?.trim()}
            >
              {isUploadingEditCover ? 'Uploading...' : updateCollectionMutation.isPending ? 'Updating...' : 'Update Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

