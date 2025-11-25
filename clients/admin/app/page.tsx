'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Button, Flex, Box, Card, Grid, Separator } from '@radix-ui/themes';
import Link from 'next/link';
import { useAuth } from '@/core/hooks/useAuth';
import { adminTokenStorage } from '@/lib/auth/token-storage';
import { 
  Shield, 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  Lock,
  Activity,
  AlertCircle
} from 'lucide-react';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeStatus, setExchangeStatus] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = searchParams.get('sessionToken');
    
    // Exchange session token if present and user is not already authenticated
    // Only exchange if we haven't already tried and failed
    if (sessionToken && !isAuthenticated && !isInitializing && !isExchanging && !error) {
      console.log('Session token found, initiating exchange...', { sessionToken: sessionToken.substring(0, 8) + '...' });
      exchangeSessionToken(sessionToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('sessionToken'), isAuthenticated, isInitializing, isExchanging]);

  const exchangeSessionToken = async (sessionToken: string) => {
    setIsExchanging(true);
    setError(null);
    setExchangeStatus('Connecting to server...');

    try {
      console.log('Exchanging admin session token...', { sessionToken: sessionToken.substring(0, 8) + '...' });
      setExchangeStatus('Calling exchange endpoint...');
      
      const { authService } = await import('@/core/api/auth/auth.service');
      setExchangeStatus('Exchanging session token...');
      
      const data = await authService.exchangeAdminSession(sessionToken);
      
      console.log('Admin session exchanged successfully', { 
        hasToken: !!data.adminSessionToken, 
        hasUser: !!data.user,
        expiresAt: data.expiresAt 
      });
      
      if (!data.adminSessionToken) {
        throw new Error('No admin session token received from server');
      }
      
      setExchangeStatus('Storing session...');
      
      // Store admin session token using token storage
      adminTokenStorage.setAdminSessionToken(
        data.adminSessionToken,
        data.expiresAt,
        data.user
      );

      console.log('Admin session stored in localStorage');
      setExchangeStatus('Session stored successfully. Redirecting to dashboard...');

      // Redirect to admin dashboard
      router.replace('/admin');
    } catch (err: any) {
      console.error('Failed to exchange admin session token:', err);
      console.error('Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        url: err?.config?.url,
        method: err?.config?.method,
        data: err?.config?.data,
      });
      
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to authenticate';
      const errorDetails = err?.response?.status 
        ? `Status: ${err?.response?.status} - ${err?.response?.statusText || 'Unknown error'}`
        : 'Network or connection error';
      
      setError(`${errorMessage} (${errorDetails})`);
      setExchangeStatus(null);
      setIsExchanging(false);
    }
  };

  if (isInitializing || isExchanging) {
    return (
      <MainLayout>
        <Flex direction="column" align="center" justify="center" gap="4" style={{ minHeight: '400px', padding: '24px' }}>
          <Text size="4" weight="medium">Authenticating...</Text>
          <Text size="2" color="gray">
            {exchangeStatus || (isExchanging ? 'Exchanging session token...' : 'Checking authentication...')}
          </Text>
          {searchParams.get('sessionToken') && (
            <Box style={{ 
              backgroundColor: 'var(--slate-3)', 
              padding: '8px 12px', 
              borderRadius: '6px',
              marginTop: '8px'
            }}>
              <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                Token: {searchParams.get('sessionToken')?.substring(0, 16)}...
              </Text>
            </Box>
          )}
        </Flex>
      </MainLayout>
    );
  }

  if (error) {
    const sessionToken = searchParams.get('sessionToken');
    return (
      <MainLayout>
        <Flex direction="column" align="center" justify="center" gap="4" style={{ minHeight: '400px', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <Heading size="6" color="red">Authentication Error</Heading>
          <Card style={{ width: '100%', borderColor: 'var(--red-6)' }}>
            <Flex direction="column" gap="4" p="5">
              <Text size="3" color="red" weight="medium">{error}</Text>
              {sessionToken && (
                <Box style={{ 
                  backgroundColor: 'var(--red-3)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  width: '100%'
                }}>
                  <Text size="1" weight="medium" color="red" mb="2">Session Token Received:</Text>
                  <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {sessionToken}
                  </Text>
                </Box>
              )}
              <Separator size="4" />
              <Text size="2" color="gray" weight="medium">Possible causes:</Text>
              <Box as="ul" style={{ paddingLeft: '20px', margin: 0 }}>
                <li><Text size="2" color="gray">The token expired (15 minute limit)</Text></li>
                <li><Text size="2" color="gray">The token was already used</Text></li>
                <li><Text size="2" color="gray">Network or server connection error</Text></li>
                <li><Text size="2" color="gray">Backend service unavailable</Text></li>
              </Box>
            </Flex>
          </Card>
          <Flex gap="2" mt="4">
            <Button variant="soft" color="red" onClick={() => {
              setError(null);
              setExchangeStatus(null);
              if (sessionToken) {
                exchangeSessionToken(sessionToken);
              }
            }}>
              Retry Exchange
            </Button>
            <Button variant="outline" onClick={() => {
              setError(null);
              router.push('/');
            }}>
              Go Home
            </Button>
          </Flex>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <Flex 
          direction="column" 
          align="center" 
          justify="center" 
          gap="6" 
          style={{ 
            minHeight: 'calc(100vh - 200px)', 
            padding: '48px 24px',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          <Box style={{ textAlign: 'center' }}>
            <Flex align="center" justify="center" gap="4" mb="6">
              <Box
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--orange-3)',
                  color: 'var(--orange-11)',
                }}
              >
                <Shield size={48} />
              </Box>
            </Flex>
            
            <Heading size="9" weight="bold" mb="3">
              Admin Dashboard
            </Heading>
            
            <Text size="5" color="gray" weight="medium" mb="2">
              Meta EN|IX Administration Portal
            </Text>
            
            <Separator size="4" my="6" style={{ width: '100%', maxWidth: '400px', margin: '24px auto' }} />
            
            <Card style={{ maxWidth: '600px', margin: '0 auto' }}>
              <Flex direction="column" gap="4" p="6">
                <Flex align="center" gap="3" justify="center">
                  <Lock size={24} style={{ color: 'var(--orange-9)' }} />
                  <Heading size="6" weight="medium">Secure Access Required</Heading>
                </Flex>
                
                <Text size="3" color="gray" style={{ textAlign: 'center' }}>
                  To access the admin dashboard, you must authenticate through the main application.
                </Text>
                
                <Box style={{ backgroundColor: 'var(--slate-3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="medium" color="gray">
                      How to access:
                    </Text>
                    <Flex direction="column" gap="2" style={{ paddingLeft: '8px' }}>
                      <Flex align="center" gap="2">
                        <Text size="2" style={{ color: 'var(--orange-9)' }}>1.</Text>
                        <Text size="2" color="gray">Log in to the main Meta EN|IX application</Text>
                      </Flex>
                      <Flex align="center" gap="2">
                        <Text size="2" style={{ color: 'var(--orange-9)' }}>2.</Text>
                        <Text size="2" color="gray">Navigate to the sidebar and click "Admin Dashboard"</Text>
                      </Flex>
                      <Flex align="center" gap="2">
                        <Text size="2" style={{ color: 'var(--orange-9)' }}>3.</Text>
                        <Text size="2" color="gray">You will be automatically authenticated and redirected here</Text>
                      </Flex>
                    </Flex>
                  </Flex>
                </Box>
                
                <Text size="1" color="gray" style={{ textAlign: 'center', marginTop: '8px' }}>
                  Administrator privileges required
                </Text>
              </Flex>
            </Card>
          </Box>
        </Flex>
      </MainLayout>
    );
  }

  const adminSections = [
    {
      title: 'Users',
      description: 'Manage user accounts, roles, and permissions',
      icon: Users,
      href: '/users',
      color: 'blue',
    },
    {
      title: 'Content',
      description: 'Moderate posts, videos, photos, and reports',
      icon: FileText,
      href: '/content',
      color: 'green',
    },
    {
      title: 'Security',
      description: 'Monitor sessions, audit logs, and security events',
      icon: Lock,
      href: '/security',
      color: 'red',
    },
    {
      title: 'Analytics',
      description: 'View platform statistics and insights',
      icon: BarChart3,
      href: '/analytics',
      color: 'purple',
    },
    {
      title: 'Settings',
      description: 'Configure platform settings and preferences',
      icon: Settings,
      href: '/settings',
      color: 'orange',
    },
    {
      title: 'Activity',
      description: 'Track system activity and performance',
      icon: Activity,
      href: '/tracking',
      color: 'cyan',
    },
  ];

  return (
    <MainLayout>
      <Box style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header Section */}
        <Flex direction="column" gap="4" mb="6">
          <Flex align="center" gap="3">
            <Shield size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Admin Dashboard</Heading>
          </Flex>
          <Text size="4" color="gray" weight="medium">
            Welcome back, <Text weight="bold">{user?.username || 'Administrator'}</Text>
          </Text>
          <Text size="2" color="gray">
            Manage and monitor the Meta EN|IX platform from this central control panel.
          </Text>
        </Flex>

        <Separator size="4" mb="6" />

        {/* Quick Access Grid */}
        <Box mb="6">
          <Heading size="6" mb="4" weight="medium">Quick Access</Heading>
          <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.href} style={{ cursor: 'pointer' }} onClick={() => router.push(section.href)}>
                  <Flex direction="column" gap="3" p="4">
                    <Flex align="center" gap="3">
                      <Box
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: `var(--${section.color}-3)`,
                          color: `var(--${section.color}-11)`,
                        }}
                      >
                        <Icon size={24} />
                      </Box>
                      <Heading size="5" weight="bold">{section.title}</Heading>
                    </Flex>
                    <Text size="2" color="gray">
                      {section.description}
                    </Text>
                  </Flex>
                </Card>
              );
            })}
          </Grid>
        </Box>

        {/* Status Section */}
        <Box>
          <Heading size="6" mb="4" weight="medium">System Status</Heading>
          <Card>
            <Flex direction="column" gap="3" p="4">
              <Flex align="center" gap="2">
                <AlertCircle size={20} style={{ color: 'var(--green-9)' }} />
                <Text size="3" weight="medium">All systems operational</Text>
              </Flex>
              <Text size="2" color="gray">
                Platform is running smoothly. No critical issues detected.
              </Text>
            </Flex>
          </Card>
        </Box>
      </Box>
    </MainLayout>
  );
}
