'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTheme } from '@/Theme/ThemeProvider';
import { Flex, Button } from '@radix-ui/themes';
import { ThemeToggle } from '@/Theme/ThemeToggle';

export function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const logoSrc = isMounted && resolvedTheme === 'light'
    ? '/images/logos/logo-dark.png'
    : '/images/logos/logo.png';

  return (
    <header
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        width: '100%',
        borderBottom: '1px solid var(--gray-6)',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <Flex 
        align="center" 
        justify="between" 
        style={{ 
          height: '64px', 
          padding: '0 16px',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
        aria-label="Main navigation"
      >
        <Flex align="center" gap="4">
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src={logoSrc}
              alt="Meta EN|IX Admin"
              width={120}
              height={40}
              style={{ height: '40px', width: 'auto' }}
              priority
            />
          </Link>
        </Flex>

        <Flex align="center" gap="2">
          <ThemeToggle />
        </Flex>
      </Flex>
    </header>
  );
}

