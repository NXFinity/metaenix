'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

/**
 * Route-Level Error Boundary
 * 
 * Wraps route components to catch errors at the route level.
 * This provides better error isolation - errors in one route don't crash the entire app.
 */
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          error={new Error('Route error occurred')}
          resetError={() => window.location.reload()}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

