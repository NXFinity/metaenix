'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from 'lucide-react';
import Link from 'next/link';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Custom Error Fallback Component
 * 
 * Can be used as a custom fallback UI for Error Boundaries
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="h-8 w-8 text-destructive" />
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-2">Error Details (Development Only):</p>
              <p className="text-sm font-mono text-destructive/80 break-all">
                {error.toString()}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={resetError} variant="default">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <HomeIcon className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

