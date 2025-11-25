'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SkipLink {
  href: string;
  label: string;
}

const skipLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#main-navigation', label: 'Skip to navigation' },
];

export function SkipLinks() {
  const pathname = usePathname();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Reset focus when pathname changes
  useEffect(() => {
    setFocusedIndex(null);
  }, [pathname]);

  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:z-[100] focus-within:left-4 focus-within:top-4">
      <nav aria-label="Skip navigation links">
        <ul className="flex flex-col gap-2">
          {skipLinks.map((link, index) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'transition-all duration-200',
                  'hover:bg-primary/90',
                  focusedIndex === index && 'ring-2 ring-ring ring-offset-2'
                )}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

