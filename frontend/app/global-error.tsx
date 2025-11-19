'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/ErrorFallback';

/**
 * Next.js Global Error Page
 * 
 * This is the error page for errors that occur in the root layout.
 * It replaces the root layout when an error occurs, so it must include html and body tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    // Example: Sentry.captureException(error);
    if (process.env.NODE_ENV === 'development') {
      console.error('Next.js Global Error:', error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorFallback error={error} resetError={reset} />
      </body>
    </html>
  );
}

