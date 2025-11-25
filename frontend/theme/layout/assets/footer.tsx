'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-background border-t border-border relative z-10">
      <div className="container mx-auto px-4 py-8">
        {/* Copyright */}
        <div>
          <p className="text-center text-sm text-muted-foreground">
            ME - Meta EN|IX © {currentYear} EN|IX Llc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

