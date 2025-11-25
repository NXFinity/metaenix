# Performance Monitoring

This document describes the performance monitoring setup for the Meta EN|IX frontend application.

## Core Web Vitals Tracking

The application tracks Core Web Vitals metrics using the `web-vitals` library:

- **LCP (Largest Contentful Paint)**: Measures loading performance
- **FID (First Input Delay)**: Measures interactivity
- **CLS (Cumulative Layout Shift)**: Measures visual stability
- **FCP (First Contentful Paint)**: Measures initial rendering
- **TTFB (Time to First Byte)**: Measures server response time
- **INP (Interaction to Next Paint)**: Measures responsiveness (replaces FID in 2024)

### Usage

The `PerformanceMonitor` component is automatically included in the root layout and tracks metrics in production. Metrics are logged to the console in development mode.

### Custom Reporting

You can customize metric reporting by modifying `core/components/PerformanceMonitor.tsx`:

```typescript
useWebVitals({
  onReport: (metric) => {
    // Send to your analytics service
    analytics.track('web-vital', metric);
  },
  endpoint: '/api/analytics/web-vitals', // Optional backend endpoint
});
```

## Bundle Size Monitoring

### Build-time Analysis

Run bundle analysis:

```bash
npm run analyze
```

This will generate a detailed bundle analysis report showing:
- Individual chunk sizes
- Module dependencies
- Duplicate dependencies
- Optimization opportunities

### Manual Analysis

Use the bundle analysis script:

```bash
npm run analyze:bundle
```

This script:
1. Builds the application
2. Analyzes JavaScript chunk sizes
3. Reports the largest chunks
4. Identifies potential optimization targets

## Performance Utilities

The `core/utils/performance.ts` module provides utilities for measuring performance:

### Measure Function Performance

```typescript
import { measurePerformance } from '@/core/utils/performance';

const result = measurePerformance('myFunction', () => {
  // Your code here
  return expensiveOperation();
});
```

### Measure Async Performance

```typescript
import { measureAsyncPerformance } from '@/core/utils/performance';

const result = await measureAsyncPerformance('myAsyncFunction', async () => {
  // Your async code here
  return await fetchData();
});
```

### Get Resource Timings

```typescript
import { getResourceTimings } from '@/core/utils/performance';

const timings = getResourceTimings();
// Returns array of resource load times
```

### Get Navigation Timing

```typescript
import { getNavigationTiming } from '@/core/utils/performance';

const timing = getNavigationTiming();
// Returns DNS, TCP, request, response, DOM, and load times
```

## Performance Budgets

Performance budgets are configured in `next.config.ts`:

- **Package Import Optimization**: Automatically optimizes imports for large libraries
- **Console Removal**: Removes console.log in production (keeps console.error and console.warn)
- **Compiler Optimizations**: Next.js compiler optimizations enabled

### Recommended Budgets

- **JavaScript**: < 200KB per route (gzipped)
- **CSS**: < 50KB per route (gzipped)
- **Images**: Optimize all images, use Next.js Image component
- **Fonts**: Use font-display: swap, preload critical fonts

## Monitoring in Production

### Vercel Analytics (Recommended)

If deployed on Vercel, you can enable Vercel Analytics:

1. Install `@vercel/analytics`:
   ```bash
   npm install @vercel/analytics
   ```

2. Add to `app/layout.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

### Custom Analytics Integration

To integrate with your own analytics service, modify `core/components/PerformanceMonitor.tsx`:

```typescript
useWebVitals({
  onReport: (metric) => {
    // Send to your analytics backend
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  },
});
```

## Performance Best Practices

1. **Code Splitting**: Use dynamic imports for large components
2. **Image Optimization**: Always use Next.js Image component
3. **Font Optimization**: Use next/font for automatic optimization
4. **Bundle Analysis**: Regularly run bundle analysis to identify bloat
5. **Lazy Loading**: Lazy load non-critical components
6. **Caching**: Leverage React Query caching for API calls
7. **Memoization**: Use React.memo and useMemo appropriately

## Troubleshooting

### High Bundle Size

1. Run `npm run analyze` to identify large dependencies
2. Check for duplicate dependencies
3. Use dynamic imports for large libraries
4. Consider code splitting for routes

### Poor Core Web Vitals

1. Check LCP: Optimize images, reduce render-blocking resources
2. Check FID/INP: Reduce JavaScript execution time, optimize event handlers
3. Check CLS: Ensure images have dimensions, avoid layout shifts

### Performance Monitoring Not Working

1. Ensure `web-vitals` package is installed
2. Check that `PerformanceMonitor` is included in layout
3. Verify environment variables (enabled in production by default)
4. Check browser console for errors

