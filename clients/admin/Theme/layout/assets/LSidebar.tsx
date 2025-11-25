'use client';

import { Flex, Box, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/users', label: 'Users' },
    { href: '/content', label: 'Content' },
    { href: '/security', label: 'Security' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <Box 
      as="aside"
      style={{
        width: '256px',
        height: '100%',
        borderRight: '1px solid var(--gray-6)',
        backgroundColor: 'var(--color-background)',
        position: 'fixed',
        left: 0,
        top: '64px',
        bottom: 0,
        overflowY: 'auto',
      }}
    >
      <Flex direction="column" style={{ padding: '16px' }} gap="2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                backgroundColor: isActive ? 'var(--accent-3)' : 'transparent',
                color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
              }}
            >
              <Text size="3" weight={isActive ? 'medium' : 'regular'}>
                {item.label}
              </Text>
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
}

