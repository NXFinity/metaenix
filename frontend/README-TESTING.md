# Frontend Testing Guide

## Overview

This project uses **Vitest** as the test runner with **React Testing Library** for component testing. The testing framework is fully configured and ready to use.

## Quick Start

```bash
# Install dependencies (includes test dependencies)
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

Tests are co-located with the code they test:
- `lib/utils.test.ts` - Tests for `lib/utils.ts`
- `components/ErrorBoundary.test.tsx` - Tests for `components/ErrorBoundary.tsx`
- `core/api/auth/auth.service.test.ts` - Tests for `core/api/auth/auth.service.ts`

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Service Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myService } from './myService';

describe('myService', () => {
  it('should perform action', async () => {
    const result = await myService.action();
    expect(result).toBe(expected);
  });
});
```

### Testing Hooks

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });
});
```

## Test Coverage

Current coverage goals:
- **Initial Threshold:** 50% (configured in `vitest.config.ts`)
- **Target Coverage:** 80%+
- **Critical Paths:** 100%

View coverage report:
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

## Mocking

### Next.js Router

Already mocked in `vitest.setup.ts`:
```typescript
import { useRouter } from 'next/navigation';
// useRouter() is automatically mocked
```

### API Calls

Mock axios or API client:
```typescript
import { vi } from 'vitest';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));
```

### localStorage

Already mocked in `vitest.setup.ts`:
```typescript
// localStorage is automatically available and cleared between tests
localStorage.setItem('key', 'value');
```

## Best Practices

1. **Test User Behavior:** Test what users see and do, not implementation details
2. **Descriptive Names:** Use clear, descriptive test names
3. **Isolation:** Keep tests independent - don't rely on test execution order
4. **Mock External Dependencies:** Mock API calls, external services, etc.
5. **Test Edge Cases:** Test error cases, empty states, boundary conditions
6. **Focus on Critical Paths:** Prioritize tests for authentication, payments, etc.

## Test Files Created

- ✅ `lib/utils.test.ts` - Utility function tests
- ✅ `lib/auth/token-storage.test.ts` - Token storage tests
- ✅ `core/store/auth-store.test.ts` - Auth store tests
- ✅ `components/ErrorBoundary.test.tsx` - Error boundary tests
- ✅ `lib/api/client.test.ts` - API client tests
- ✅ `core/api/auth/auth.service.test.ts` - Auth service tests

## Next Steps

1. Add tests for remaining API services
2. Add tests for custom hooks
3. Add tests for critical components
4. Set up E2E tests (Playwright/Cypress)
5. Integrate with CI/CD pipeline

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

