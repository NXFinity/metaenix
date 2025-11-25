'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/Theme/ThemeProvider';
import { Button, DropdownMenu, Text, Flex } from '@radix-ui/themes';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="2" aria-label="Toggle theme" disabled>
        <div style={{ width: '16px', height: '16px' }} />
      </Button>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost" size="2" aria-label="Toggle theme">
          {resolvedTheme === 'dark' ? (
            <Moon style={{ width: '16px', height: '16px' }} />
          ) : (
            <Sun style={{ width: '16px', height: '16px' }} />
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => setTheme('light')}>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <Sun style={{ width: '16px', height: '16px' }} />
            <Text>Light</Text>
            {theme === 'light' && <Text size="1" style={{ marginLeft: 'auto' }}>✓</Text>}
          </Flex>
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setTheme('dark')}>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <Moon style={{ width: '16px', height: '16px' }} />
            <Text>Dark</Text>
            {theme === 'dark' && <Text size="1" style={{ marginLeft: 'auto' }}>✓</Text>}
          </Flex>
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setTheme('system')}>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <Monitor style={{ width: '16px', height: '16px' }} />
            <Text>System</Text>
            {theme === 'system' && <Text size="1" style={{ marginLeft: 'auto' }}>✓</Text>}
          </Flex>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

