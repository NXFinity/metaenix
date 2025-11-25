'use client';

import { Flex, Text } from '@radix-ui/themes';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--gray-6)',
        backgroundColor: 'var(--color-background)',
        padding: '16px',
      }}
    >
      <Flex
        align="center"
        justify="center"
        style={{ maxWidth: '1280px', margin: '0 auto' }}
      >
        <Text size="2" color="gray">
          ME - Meta EN|IX © {new Date().getFullYear()} EN|IX Llc. All rights reserved.
        </Text>
      </Flex>
    </footer>
  );
}

