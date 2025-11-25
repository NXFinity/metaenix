'use client';

import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { adminService } from '@/core/api/admin/admin.service';
import { Settings, ToggleLeft } from 'lucide-react';

export default function AdminSettingsPage() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Note: GET_SETTINGS endpoint needs to be added to adminService
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      // Placeholder - will be implemented when endpoint is ready
      return { message: 'Settings endpoint coming soon' };
    },
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
            <Settings size={32} style={{ color: 'var(--accent-9)' }} />
            <Heading size="9" weight="bold">Settings</Heading>
          </Flex>
          <Text size="3" color="gray">
            Configure platform settings and preferences
          </Text>
        </Flex>

        <Card>
          <Flex direction="column" gap="4" p="4">
            <Flex align="center" gap="2">
              <ToggleLeft size={20} style={{ color: 'var(--gray-9)' }} />
              <Heading size="5" weight="medium">System Settings</Heading>
            </Flex>
            {isLoading ? (
              <Text size="2" color="gray">Loading settings...</Text>
            ) : (
              <Text size="2" color="gray">Settings management interface coming soon...</Text>
            )}
          </Flex>
        </Card>
      </Box>
    </MainLayout>
  );
}

