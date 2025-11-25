'use client';

import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card, Grid } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { adminService } from '@/core/api/admin/admin.service';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isInitializing } = useAuth();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => adminService.getAnalyticsOverview(),
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
            <BarChart3 size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Analytics</Heading>
          </Flex>
          <Text size="3" color="gray">
            Platform analytics and insights
          </Text>
        </Flex>

        {isLoading ? (
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <Text size="3" color="gray">Loading analytics...</Text>
          </Flex>
        ) : (
          <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
            <Card>
              <Flex direction="column" gap="3" p="4">
                <Users size={24} style={{ color: 'var(--blue-9)' }} />
                <Heading size="6" weight="bold">
                  {analyticsData?.totalUsers?.toLocaleString() || '0'}
                </Heading>
                <Text size="2" color="gray">Total Users</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" gap="3" p="4">
                <FileText size={24} style={{ color: 'var(--green-9)' }} />
                <Heading size="6" weight="bold">
                  {analyticsData?.totalContent?.toLocaleString() || '0'}
                </Heading>
                <Text size="2" color="gray">Total Content</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" gap="3" p="4">
                <TrendingUp size={24} style={{ color: 'var(--purple-9)' }} />
                <Heading size="6" weight="bold">
                  {analyticsData?.engagementRate?.toFixed(1) || '0'}%
                </Heading>
                <Text size="2" color="gray">Engagement Rate</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" gap="3" p="4">
                <BarChart3 size={24} style={{ color: 'var(--orange-9)' }} />
                <Heading size="6" weight="bold">
                  {analyticsData?.growthRate?.toFixed(1) || '0'}%
                </Heading>
                <Text size="2" color="gray">Growth Rate</Text>
              </Flex>
            </Card>
          </Grid>
        )}
      </Box>
    </MainLayout>
  );
}

