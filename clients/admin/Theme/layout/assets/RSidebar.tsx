'use client';

import { Flex, Box, Text } from '@radix-ui/themes';

export function RSidebar() {
  return (
    <Box 
      as="aside"
      style={{
        width: '256px',
        height: '100%',
        borderLeft: '1px solid var(--gray-6)',
        backgroundColor: 'var(--color-background)',
        position: 'fixed',
        right: 0,
        top: '64px',
        bottom: 0,
        overflowY: 'auto',
      }}
    >
      <Flex direction="column" style={{ padding: '16px' }} gap="2">
        <Text size="2" weight="medium" color="gray">
          Right Sidebar
        </Text>
      </Flex>
    </Box>
  );
}

