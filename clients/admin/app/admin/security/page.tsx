'use client';

import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card, Grid, Badge } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { adminService } from '@/core/api/admin/admin.service';
import { Lock, Shield, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function AdminSecurityPage() {
  const { isAuthenticated, isInitializing } = useAuth();

  const { data: alertsData, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['admin', 'security', 'alerts'],
    queryFn: () => adminService.getSecurityAlerts(),
    enabled: isAuthenticated,
  });

  const { data: auditLogsData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['admin', 'security', 'audit'],
    queryFn: () => adminService.getAuditLogs({ limit: 10 }),
    enabled: isAuthenticated,
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

  return (
    <MainLayout>
      <Box style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <Flex direction="column" gap="4" mb="6">
          <Flex align="center" gap="3">
            <Lock size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Security</Heading>
          </Flex>
          <Text size="3" color="gray">
            Monitor security alerts, audit logs, and active sessions
          </Text>
        </Flex>

        <Grid columns={{ initial: '1', lg: '2' }} gap="4" mb="6">
          <Card>
            <Flex direction="column" gap="3" p="4">
              <Flex align="center" gap="2">
                <AlertTriangle size={20} style={{ color: 'var(--red-9)' }} />
                <Heading size="5" weight="medium">Security Alerts</Heading>
              </Flex>
              {isLoadingAlerts ? (
                <Text size="2" color="gray">Loading...</Text>
              ) : (
                <>
                  <Text size="6" weight="bold">
                    {alertsData?.length || 0}
                  </Text>
                  <Text size="2" color="gray">Active security alerts</Text>
                </>
              )}
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="3" p="4">
              <Flex align="center" gap="2">
                <Shield size={20} style={{ color: 'var(--blue-9)' }} />
                <Heading size="5" weight="medium">Audit Logs</Heading>
              </Flex>
              {isLoadingAudit ? (
                <Text size="2" color="gray">Loading...</Text>
              ) : (
                <>
                  <Text size="6" weight="bold">
                    {auditLogsData?.length || 0}
                  </Text>
                  <Text size="2" color="gray">Recent audit log entries</Text>
                </>
              )}
            </Flex>
          </Card>
        </Grid>

        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="5" weight="medium" mb="2">Recent Audit Logs</Heading>
            {isLoadingAudit ? (
              <Text size="2" color="gray">Loading audit logs...</Text>
            ) : auditLogsData?.length === 0 ? (
              <Text size="2" color="gray">No audit logs found</Text>
            ) : (
              <Text size="2" color="gray">Audit log table coming soon...</Text>
            )}
          </Flex>
        </Card>
      </Box>
    </MainLayout>
  );
}

