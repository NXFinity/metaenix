'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="container mx-auto px-4 py-8">
        {/* Copyright */}
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            ME - Meta EN|IX © {currentYear} EN|IX Llc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

