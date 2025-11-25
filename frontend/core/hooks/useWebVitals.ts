'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP, Metric } from 'web-vitals';

interface WebVitalsOptions {
  onReport?: (metric: Metric) => void;
  endpoint?: string;
  enabled?: boolean;
}

/**
 * Hook to track Core Web Vitals and send them to an analytics endpoint
 */
export function useWebVitals({
  onReport,
  endpoint = '/api/analytics/web-vitals',
  enabled = true,
}: WebVitalsOptions = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleMetric = (metric: Metric) => {
      // Call custom callback if provided
      if (onReport) {
        onReport(metric);
      }

      // Send to analytics endpoint
      if (endpoint && typeof fetch !== 'undefined') {
        // Use sendBeacon for better reliability
        const body = JSON.stringify(metric);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, body);
        } else {
          // Fallback to fetch
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {
            // Silently fail - don't block user experience
          });
        }
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Web Vitals]', metric);
      }
    };

    // Track Core Web Vitals
    onCLS(handleMetric);
    onFID(handleMetric);
    onLCP(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric); // Interaction to Next Paint (replaces FID in 2024)
  }, [onReport, endpoint, enabled]);
}

