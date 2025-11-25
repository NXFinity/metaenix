'use client';

import { useWebVitals } from '@/core/hooks/useWebVitals';
import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});

  useWebVitals({
    onReport: (metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value,
      }));

      // Send to backend analytics if needed
      // This could be integrated with your existing analytics service
    },
    enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true',
  });

  // Log metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && Object.keys(metrics).length > 0) {
      console.log('[Performance Metrics]', metrics);
    }
  }, [metrics]);

  return null; // This component doesn't render anything
}

