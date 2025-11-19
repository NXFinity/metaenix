'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/ErrorFallback';

/**
 * Next.js Error Page
 * 
 * This is the error page that Next.js uses for unhandled errors.
 * It's automatically used when an error occurs in a Server Component or during SSR.
 */
export default function Error({
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
      console.error('Next.js Error Page:', error);
    }
  }, [error]);

  return <ErrorFallback error={error} resetError={reset} />;
}
