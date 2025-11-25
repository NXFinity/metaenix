'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSecurityService } from '@/core/api/security/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
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
import { Shield, AlertTriangle, FileText, Users, Ban, X, ChevronLeft, ChevronRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useAlerts } from '@/theme/components/alerts';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminSecurityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert } = useAlerts();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [eventSeverity, setEventSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | undefined>(undefined);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isBlockIpDialogOpen, setIsBlockIpDialogOpen] = useState(false);
  const [blockIpForm, setBlockIpForm] = useState({ ip: '', reason: '' });
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

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

  // Fetch security alerts
  const { data: alerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['admin', 'security', 'alerts'],
    queryFn: () => adminSecurityService.getAlerts(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch security events
  const { data: events, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin', 'security', 'events', page, limit, eventSeverity],
    queryFn: () => adminSecurityService.getEvents({ page, limit, severity: eventSeverity }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: (userId: string) => adminSecurityService.terminateSession(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'sessions'] });
      setIsTerminateDialogOpen(false);
      setSelectedSession(null);
      showAlert('Session terminated successfully', 'success');
    },
  });

  // Block IP mutation
  const blockIpMutation = useMutation({
    mutationFn: (data: { ip: string; reason?: string }) => adminSecurityService.blockIP(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'ip-blocks'] });
      setIsBlockIpDialogOpen(false);
      setBlockIpForm({ ip: '', reason: '' });
      showAlert('IP blocked successfully', 'success');
    },
  });

  // Unblock IP mutation
  const unblockIpMutation = useMutation({
    mutationFn: (ip: string) => adminSecurityService.unblockIP(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'ip-blocks'] });
      showAlert('IP unblocked successfully', 'success');
    },
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['admin', 'security', 'audit', page, limit],
    queryFn: () => adminSecurityService.getAuditLogs({ page, limit }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch sessions - refetch when Sessions tab is active
  const { data: sessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['admin', 'security', 'sessions'],
    queryFn: () => adminSecurityService.getSessions(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Refetch sessions when Sessions tab becomes active
  useEffect(() => {
    if (activeTab === 'sessions' && isAuthenticated && !!user && isAdmin(user.role)) {
      refetchSessions();
    }
  }, [activeTab, isAuthenticated, user, refetchSessions]);

  // Fetch IP blocks
  const { data: ipBlocks, isLoading: isLoadingIpBlocks } = useQuery({
    queryKey: ['admin', 'security', 'ip-blocks'],
    queryFn: () => adminSecurityService.getBlockedIPs(),
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
          message="You must be logged in to access the admin security"
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
                  <Shield className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Security
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Monitor security alerts, events, and manage access
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="ip-blocks">IP Blocks</TabsTrigger>
        </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Security Alerts
              </CardTitle>
              <CardDescription>Active security alerts and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <LoadingSpinner />
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div
                      key={alert.type || idx}
                      className={`p-4 border rounded-lg ${
                        alert.severity === 'critical'
                          ? 'border-red-500/50 bg-red-500/10'
                          : alert.severity === 'high'
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : alert.severity === 'medium'
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{alert.type}</p>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${
                              alert.severity === 'critical'
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                : alert.severity === 'high'
                                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                                : alert.severity === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Count: {alert.count}</span>
                            <span>
                              First: {new Date(alert.firstOccurrence).toLocaleString()}
                            </span>
                            <span>
                              Last: {new Date(alert.lastOccurrence).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No security alerts</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Security Events
                  </CardTitle>
                  <CardDescription>Recent security events and incidents</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={eventSeverity === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSeverity(undefined)}
                  >
                    All
                  </Button>
                  <Button
                    variant={eventSeverity === 'critical' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSeverity('critical')}
                  >
                    Critical
                  </Button>
                  <Button
                    variant={eventSeverity === 'high' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSeverity('high')}
                  >
                    High
                  </Button>
                  <Button
                    variant={eventSeverity === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSeverity('medium')}
                  >
                    Medium
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingEvents ? (
                <LoadingSpinner />
              ) : events && events.data && events.data.length > 0 ? (
                <div className="space-y-4">
                  {events.data.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 border rounded-lg ${
                        event.severity === 'critical'
                          ? 'border-red-500/50 bg-red-500/10'
                          : event.severity === 'high'
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : event.severity === 'medium'
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{event.type}</p>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${
                              event.severity === 'critical'
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                : event.severity === 'high'
                                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                                : event.severity === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            }`}>
                              {event.severity}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{event.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {event.userId && <span>User: {event.userId}</span>}
                            {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                            {event.endpoint && <span>Endpoint: {event.endpoint}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {events.meta && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((events.meta.page - 1) * events.meta.limit) + 1} to{' '}
                        {Math.min(events.meta.page * events.meta.limit, events.meta.total)} of{' '}
                        {events.meta.total} events
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={!events.meta.hasPreviousPage || page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={!events.meta.hasNextPage}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No security events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>System audit trail and activity logs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingAudit ? (
                <div className="p-6">
                  <LoadingSpinner />
                </div>
              ) : auditLogs && auditLogs.data && auditLogs.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 h-[700px] p-6">
                  {/* Left Column: Log List */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                      {auditLogs.data.map((log) => (
                        <div
                          key={log.id}
                          onClick={() => setSelectedAuditLog(log)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAuditLog?.id === log.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate mb-1">
                                {log.message || log.action || log.type || 'No message'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {log.category && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {log.category}
                                  </span>
                                )}
                                {log.level && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded">
                                    {log.level}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {log.username && <span>{log.username}</span>}
                                {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp || log.createdAt || log.dateCreated).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {auditLogs.meta && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Showing {((auditLogs.meta.page - 1) * auditLogs.meta.limit) + 1} to{' '}
                          {Math.min(auditLogs.meta.page * auditLogs.meta.limit, auditLogs.meta.total)} of{' '}
                          {auditLogs.meta.total} logs
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => Math.max(1, p - 1));
                              setSelectedAuditLog(null);
                            }}
                            disabled={!auditLogs.meta.hasPreviousPage || page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(p => p + 1);
                              setSelectedAuditLog(null);
                            }}
                            disabled={!auditLogs.meta.hasNextPage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Log Details */}
                  <div className="flex flex-col border rounded-lg overflow-hidden min-h-0">
                    {selectedAuditLog ? (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Log Details</h3>
                          <div className="h-px bg-border mb-4" />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">Message</Label>
                            <p className="mt-1 font-medium">{selectedAuditLog.message || 'No message'}</p>
                          </div>

                          {selectedAuditLog.details && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Details</Label>
                              <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                <pre className="text-sm whitespace-pre-wrap break-words">
                                  {typeof selectedAuditLog.details === 'string'
                                    ? selectedAuditLog.details
                                    : JSON.stringify(selectedAuditLog.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {selectedAuditLog.level && (
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase">Level</Label>
                                <p className="mt-1">{selectedAuditLog.level}</p>
                              </div>
                            )}
                            {selectedAuditLog.category && (
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase">Category</Label>
                                <p className="mt-1">{selectedAuditLog.category}</p>
                              </div>
                            )}
                          </div>

                          {(selectedAuditLog.userId || selectedAuditLog.username) && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">User</Label>
                              <div className="mt-1 space-y-1">
                                {selectedAuditLog.username && (
                                  <p className="font-medium">{selectedAuditLog.username}</p>
                                )}
                                {selectedAuditLog.userId && (
                                  <p className="text-sm text-muted-foreground">ID: {selectedAuditLog.userId}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {(selectedAuditLog.ipAddress || selectedAuditLog.userAgent) && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Request Info</Label>
                              <div className="mt-1 space-y-1">
                                {selectedAuditLog.ipAddress && (
                                  <p className="text-sm">IP: {selectedAuditLog.ipAddress}</p>
                                )}
                                {selectedAuditLog.userAgent && (
                                  <p className="text-sm text-muted-foreground break-words">
                                    {selectedAuditLog.userAgent}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {(selectedAuditLog.endpoint || selectedAuditLog.method || selectedAuditLog.statusCode) && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">HTTP Request</Label>
                              <div className="mt-1 space-y-1">
                                {selectedAuditLog.method && selectedAuditLog.endpoint && (
                                  <p className="text-sm font-mono">
                                    {selectedAuditLog.method} {selectedAuditLog.endpoint}
                                  </p>
                                )}
                                {selectedAuditLog.statusCode && (
                                  <p className="text-sm">Status: {selectedAuditLog.statusCode}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedAuditLog.requestId && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Request ID</Label>
                              <p className="mt-1 text-sm font-mono">{selectedAuditLog.requestId}</p>
                            </div>
                          )}

                          {selectedAuditLog.metadata && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Metadata</Label>
                              <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                <pre className="text-sm whitespace-pre-wrap break-words">
                                  {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {selectedAuditLog.error && (
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase text-destructive">Error</Label>
                              <div className="mt-1 p-3 bg-destructive/10 rounded-md">
                                <pre className="text-sm whitespace-pre-wrap break-words text-destructive">
                                  {JSON.stringify(selectedAuditLog.error, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">Timestamp</Label>
                            <p className="mt-1 text-sm">
                              {new Date(
                                selectedAuditLog.timestamp ||
                                selectedAuditLog.createdAt ||
                                selectedAuditLog.dateCreated
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Select a log from the list to view details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No audit logs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <LoadingSpinner />
              ) : sessions && sessions.data && sessions.data.length > 0 ? (
                <div className="space-y-4">
                  {sessions.data.map((session) => (
                    <div key={session.userId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-2">
                            {session.displayName || session.username || session.userId}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>User ID: {session.userId}</span>
                            {session.websocketId && (
                              <span>WebSocket: {session.websocketId.substring(0, 8)}...</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedSession(session.userId);
                            setIsTerminateDialogOpen(true);
                          }}
                          disabled={terminateSessionMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Terminate
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sessions.meta && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((sessions.meta.page - 1) * sessions.meta.limit) + 1} to{' '}
                        {Math.min(sessions.meta.page * sessions.meta.limit, sessions.meta.total)} of{' '}
                        {sessions.meta.total} sessions
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={!sessions.meta.hasPreviousPage || page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={!sessions.meta.hasNextPage}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active sessions</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="ip-blocks" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="w-5 h-5" />
                    IP Blocks
                  </CardTitle>
                  <CardDescription>Blocked IP addresses</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsBlockIpDialogOpen(true)}
                >
                  Block IP
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingIpBlocks ? (
                <LoadingSpinner />
              ) : ipBlocks && ipBlocks.length > 0 ? (
                <div className="space-y-2">
                  {ipBlocks.map((block) => (
                    <div key={block.ip} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{block.ip}</p>
                          {block.reason && (
                            <p className="text-sm text-muted-foreground mb-2">{block.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Blocked: {block.blockedAt ? new Date(block.blockedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unblockIpMutation.mutate(block.ip)}
                          disabled={unblockIpMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Unblock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No IP blocks</p>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate this user&apos;s session? They will be logged out immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTerminateDialogOpen(false);
                setSelectedSession(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSession) {
                  terminateSessionMutation.mutate(selectedSession);
                }
              }}
              disabled={terminateSessionMutation.isPending}
            >
              {terminateSessionMutation.isPending ? 'Terminating...' : 'Terminate Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockIpDialogOpen} onOpenChange={setIsBlockIpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block IP Address</DialogTitle>
            <DialogDescription>
              Block an IP address from accessing the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-ip">IP Address</Label>
              <Input
                id="block-ip"
                value={blockIpForm.ip}
                onChange={(e) => setBlockIpForm({ ...blockIpForm, ip: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason (optional)</Label>
              <Input
                id="block-reason"
                value={blockIpForm.reason}
                onChange={(e) => setBlockIpForm({ ...blockIpForm, reason: e.target.value })}
                placeholder="Reason for blocking"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBlockIpDialogOpen(false);
                setBlockIpForm({ ip: '', reason: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (blockIpForm.ip) {
                  blockIpMutation.mutate({
                    ip: blockIpForm.ip,
                    reason: blockIpForm.reason || undefined,
                  });
                }
              }}
              disabled={blockIpMutation.isPending || !blockIpForm.ip}
            >
              {blockIpMutation.isPending ? 'Blocking...' : 'Block IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

