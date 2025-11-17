'use client';

import { MainLayout } from '@/theme/layout/MainLayout';
import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
import { Textarea } from '@/theme/ui/textarea';
import { Checkbox } from '@/theme/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { developerService } from '@/core/api/developer';
import type {
  DeveloperStatus,
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/core/api/developer/types/developer.type';
import { ApplicationEnvironment } from '@/core/api/developer/types/developer.type';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CopyIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/theme/ui/dialog';

export default function DeveloperPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [storedSecret, setStoredSecret] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check developer status
  const {
    data: developerStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['developer', 'status'],
    queryFn: () => developerService.getStatus(),
    enabled: isAuthenticated,
  });

  // Get applications
  const {
    data: applications,
    isLoading: isLoadingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ['developer', 'applications'],
    queryFn: () => developerService.getApplications(),
    enabled: isAuthenticated && user?.isDeveloper === true,
  });

  // Register as developer mutation
  const registerMutation = useMutation({
    mutationFn: (data: { acceptTerms: boolean }) => developerService.register(data),
    onSuccess: () => {
      showNotification('success', 'Successfully registered as developer');
      refetchUser();
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['developer'] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to register as developer');
    },
  });

  // Create application mutation
  const createAppMutation = useMutation({
    mutationFn: (data: CreateApplicationRequest) => developerService.createApplication(data),
    onSuccess: (response) => {
      showNotification('success', 'Application created successfully');
      setShowCreateDialog(false);
      setStoredSecret(response.clientSecret);
      setSelectedApp(response.application);
      setShowSecretDialog(true);
      refetchApps();
      queryClient.invalidateQueries({ queryKey: ['developer', 'applications'] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to create application');
    },
  });

  // Update application mutation
  const updateAppMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicationRequest }) =>
      developerService.updateApplication(id, data),
    onSuccess: () => {
      showNotification('success', 'Application updated successfully');
      setShowEditDialog(false);
      setSelectedApp(null);
      refetchApps();
      queryClient.invalidateQueries({ queryKey: ['developer', 'applications'] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to update application');
    },
  });

  // Delete application mutation
  const deleteAppMutation = useMutation({
    mutationFn: (id: string) => developerService.deleteApplication(id),
    onSuccess: () => {
      showNotification('success', 'Application deleted successfully');
      setShowDeleteDialog(false);
      setSelectedApp(null);
      refetchApps();
      queryClient.invalidateQueries({ queryKey: ['developer', 'applications'] });
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to delete application');
    },
  });

  // Regenerate secret mutation
  const regenerateSecretMutation = useMutation({
    mutationFn: (id: string) => developerService.regenerateSecret(id),
    onSuccess: (response) => {
      showNotification('success', 'Client secret regenerated');
      setStoredSecret(response.clientSecret);
      setShowSecretDialog(true);
      refetchApps();
    },
    onError: (error: any) => {
      showNotification('error', error?.response?.data?.message || 'Failed to regenerate secret');
    },
  });

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    showNotification('success', 'Client secret copied to clipboard');
  };

  const handleRevealSecret = (appId: string) => {
    setRevealedSecrets((prev) => new Set(prev).add(appId));
  };

  const handleHideSecret = (appId: string) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
  };

  // Show loading while initializing auth
  if (isInitializing || isLoadingStatus) {
    return (
      <MainLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  // Require authentication
  if (!isInitializing && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // If authenticated but wrong user, redirect to their own developer page
  if (!isInitializing && isAuthenticated && user && user.username !== username) {
    router.push(`/${user.username}/developer`);
    return null;
  }

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
      <div className="flex flex-1 flex-col max-w-6xl mx-auto w-full p-4 md:p-8">
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
            Developer Portal
          </h1>
          <p className="text-muted-foreground">
            Manage your applications and API access
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

        {/* Developer Status / Registration */}
        {!user.isDeveloper && developerStatus && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Become a Developer</CardTitle>
              <CardDescription>
                Register to create and manage OAuth applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!developerStatus.eligible && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Requirements not met:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {developerStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {developerStatus.eligible && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Checkbox id="acceptTerms" />
                    <Label htmlFor="acceptTerms" className="text-sm">
                      I accept the developer terms and conditions
                    </Label>
                  </div>
                  <Button
                    onClick={() => registerMutation.mutate({ acceptTerms: true })}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Register as Developer'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        {user.isDeveloper && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Applications</h2>
              {applications && applications.length < 2 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Application
                </Button>
              )}
            </div>

            {isLoadingApps ? (
              <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
            ) : applications && applications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {app.environment === ApplicationEnvironment.PRODUCTION
                              ? 'Production'
                              : 'Development'}
                          </CardDescription>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            app.status === 'ACTIVE'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : app.status === 'PENDING'
                              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {app.description && (
                        <p className="text-sm text-muted-foreground">{app.description}</p>
                      )}
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Client ID</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded">
                              {app.clientId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(app.clientId);
                                showNotification('success', 'Client ID copied');
                              }}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Client Secret</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded">
                              {revealedSecrets.has(app.id) ? '••••••••••••••••' : '••••••••••••••••'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                revealedSecrets.has(app.id)
                                  ? handleHideSecret(app.id)
                                  : handleRevealSecret(app.id)
                              }
                            >
                              {revealedSecrets.has(app.id) ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowEditDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateSecretMutation.mutate(app.id)}
                          disabled={regenerateSecretMutation.isPending}
                        >
                          <RefreshCwIcon className="h-4 w-4 mr-2" />
                          Regenerate Secret
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No applications yet</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Your First Application
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Application Dialog */}
        <CreateApplicationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={(data) => createAppMutation.mutate(data)}
          isLoading={createAppMutation.isPending}
        />

        {/* Edit Application Dialog */}
        {selectedApp && (
          <EditApplicationDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            application={selectedApp}
            onSubmit={(data) => updateAppMutation.mutate({ id: selectedApp.id, data })}
            isLoading={updateAppMutation.isPending}
          />
        )}

        {/* Secret Display Dialog */}
        {selectedApp && (
          <SecretDialog
            open={showSecretDialog}
            onOpenChange={(open) => {
              setShowSecretDialog(open);
              if (!open) {
                setStoredSecret(null);
              }
            }}
            secret={storedSecret || undefined}
            applicationName={selectedApp.name}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {selectedApp && (
          <DeleteApplicationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            applicationName={selectedApp.name}
            onConfirm={() => deleteAppMutation.mutate(selectedApp.id)}
            isLoading={deleteAppMutation.isPending}
          />
        )}
      </div>
    </MainLayout>
  );
}

// Create Application Dialog Component
function CreateApplicationDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateApplicationRequest) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: ApplicationEnvironment.DEVELOPMENT,
    redirectUris: '',
    iconUrl: '',
    websiteUrl: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      environment: formData.environment,
      redirectUris: formData.redirectUris
        ? formData.redirectUris.split('\n').filter((uri) => uri.trim())
        : undefined,
      iconUrl: formData.iconUrl || undefined,
      websiteUrl: formData.websiteUrl || undefined,
      privacyPolicyUrl: formData.privacyPolicyUrl || undefined,
      termsOfServiceUrl: formData.termsOfServiceUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Application</DialogTitle>
          <DialogDescription>
            Create a new OAuth application. You can have up to 2 applications (one production, one development).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Application Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Environment *</Label>
            <select
              id="environment"
              value={formData.environment}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  environment: e.target.value as ApplicationEnvironment,
                })
              }
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            >
              <option value={ApplicationEnvironment.DEVELOPMENT}>Development</option>
              <option value={ApplicationEnvironment.PRODUCTION}>Production</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectUris">Redirect URIs (one per line)</Label>
            <Textarea
              id="redirectUris"
              value={formData.redirectUris}
              onChange={(e) => setFormData({ ...formData, redirectUris: e.target.value })}
              placeholder="https://example.com/callback"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iconUrl">Icon URL</Label>
              <Input
                id="iconUrl"
                type="url"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
              <Input
                id="privacyPolicyUrl"
                type="url"
                value={formData.privacyPolicyUrl}
                onChange={(e) => setFormData({ ...formData, privacyPolicyUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termsOfServiceUrl">Terms of Service URL</Label>
              <Input
                id="termsOfServiceUrl"
                type="url"
                value={formData.termsOfServiceUrl}
                onChange={(e) => setFormData({ ...formData, termsOfServiceUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Application Dialog Component
function EditApplicationDialog({
  open,
  onOpenChange,
  application,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application;
  onSubmit: (data: UpdateApplicationRequest) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: application.name,
    description: application.description || '',
    redirectUris: application.redirectUris?.join('\n') || '',
    iconUrl: application.iconUrl || '',
    websiteUrl: application.websiteUrl || '',
    privacyPolicyUrl: application.privacyPolicyUrl || '',
    termsOfServiceUrl: application.termsOfServiceUrl || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      redirectUris: formData.redirectUris
        ? formData.redirectUris.split('\n').filter((uri) => uri.trim())
        : undefined,
      iconUrl: formData.iconUrl || undefined,
      websiteUrl: formData.websiteUrl || undefined,
      privacyPolicyUrl: formData.privacyPolicyUrl || undefined,
      termsOfServiceUrl: formData.termsOfServiceUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
          <DialogDescription>Update your application details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Application Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-redirectUris">Redirect URIs (one per line)</Label>
            <Textarea
              id="edit-redirectUris"
              value={formData.redirectUris}
              onChange={(e) => setFormData({ ...formData, redirectUris: e.target.value })}
              placeholder="https://example.com/callback"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-websiteUrl">Website URL</Label>
              <Input
                id="edit-websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-iconUrl">Icon URL</Label>
              <Input
                id="edit-iconUrl"
                type="url"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-privacyPolicyUrl">Privacy Policy URL</Label>
              <Input
                id="edit-privacyPolicyUrl"
                type="url"
                value={formData.privacyPolicyUrl}
                onChange={(e) => setFormData({ ...formData, privacyPolicyUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-termsOfServiceUrl">Terms of Service URL</Label>
              <Input
                id="edit-termsOfServiceUrl"
                type="url"
                value={formData.termsOfServiceUrl}
                onChange={(e) => setFormData({ ...formData, termsOfServiceUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Secret Display Dialog Component
function SecretDialog({
  open,
  onOpenChange,
  secret,
  applicationName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secret?: string;
  applicationName: string;
}) {
  const handleCopy = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client Secret</DialogTitle>
          <DialogDescription>
            This is your client secret for <strong>{applicationName}</strong>. Store it securely - it
            will not be shown again.
          </DialogDescription>
        </DialogHeader>
        {secret && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted px-3 py-2 rounded break-all">
                {secret}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Make sure to copy this secret now. You won't be able to see it again.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>I've Saved It</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Application Dialog Component
function DeleteApplicationDialog({
  open,
  onOpenChange,
  applicationName,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationName: string;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Application</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{applicationName}</strong>? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

