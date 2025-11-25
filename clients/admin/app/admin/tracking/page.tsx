'use client';

import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card, Grid } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { adminService } from '@/core/api/admin/admin.service';
import { Activity, TrendingUp, Server, AlertCircle } from 'lucide-react';

export default function AdminTrackingPage() {
  const { isAuthenticated, isInitializing } = useAuth();

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['admin', 'tracking', 'activity'],
    queryFn: () => adminService.getActivity({ days: 7 }),
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
            <Activity size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Tracking & Logs</Heading>
          </Flex>
          <Text size="3" color="gray">
            Track system activity and performance
          </Text>
        </Flex>

        <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4" mb="6">
          <Card>
            <Flex direction="column" gap="3" p="4">
              <Activity size={24} style={{ color: 'var(--blue-9)' }} />
              <Heading size="6" weight="bold">Activity</Heading>
              <Text size="2" color="gray">Platform activity tracking</Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" gap="3" p="4">
              <TrendingUp size={24} style={{ color: 'var(--green-9)' }} />
              <Heading size="6" weight="bold">Statistics</Heading>
              <Text size="2" color="gray">Platform statistics</Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" gap="3" p="4">
              <Server size={24} style={{ color: 'var(--purple-9)' }} />
              <Heading size="6" weight="bold">System Logs</Heading>
              <Text size="2" color="gray">System log management</Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" gap="3" p="4">
              <AlertCircle size={24} style={{ color: 'var(--red-9)' }} />
              <Heading size="6" weight="bold">Error Logs</Heading>
              <Text size="2" color="gray">Error log tracking</Text>
            </Flex>
          </Card>
        </Grid>

        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="5" weight="medium" mb="2">Recent Activity</Heading>
            {isLoading ? (
              <Text size="2" color="gray">Loading activity...</Text>
            ) : (
              <Text size="2" color="gray">Activity tracking interface coming soon...</Text>
            )}
          </Flex>
        </Card>
      </Box>
    </MainLayout>
  );
}

