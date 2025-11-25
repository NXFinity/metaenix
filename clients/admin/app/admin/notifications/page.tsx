'use client';

import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { Bell } from 'lucide-react';

export default function AdminNotificationsPage() {
  const { isAuthenticated, isInitializing } = useAuth();

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
            <Bell size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Notifications</Heading>
          </Flex>
          <Text size="3" color="gray">
            Manage admin notifications and alerts
          </Text>
        </Flex>

        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="5" weight="medium" mb="2">Admin Notifications</Heading>
            <Text size="2" color="gray">
              Notification management interface coming soon...
            </Text>
          </Flex>
        </Card>
      </Box>
    </MainLayout>
  );
}

