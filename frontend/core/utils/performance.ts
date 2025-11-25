/**
 * Performance monitoring utilities
 */

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (typeof window === 'undefined' || !window.performance) {
    return fn();
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;

  performance.mark(startMark);
  const result = fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  const measure = performance.getEntriesByName(measureName)[0];
  if (measure && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
  }

  // Clean up
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return result;
}

/**
 * Measure async performance of a function
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined' || !window.performance) {
    return fn();
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;

  performance.mark(startMark);
  const result = await fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  const measure = performance.getEntriesByName(measureName)[0];
  if (measure && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
  }

  // Clean up
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return result;
}

/**
 * Get resource timing entries
 */
export function getResourceTimings(): PerformanceEntry[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return resources.map((entry) => ({
    name: entry.name,
    entryType: entry.entryType,
    startTime: entry.startTime,
    duration: entry.duration,
  }));
}

/**
 * Get navigation timing
 */
export function getNavigationTiming() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domContentLoadedEventEnd - navigation.domLoading,
    load: navigation.loadEventEnd - navigation.navigationStart,
  };
}

/**
 * Monitor bundle size (client-side check)
 */
export function getBundleSize(): { js: number; css: number; total: number } | null {
  if (typeof window === 'undefined') return null;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  // This is a rough estimate - actual bundle size should be measured at build time
  return {
    js: scripts.length,
    css: styles.length,
    total: scripts.length + styles.length,
  };
}

