# Testing Guide

## Test Structure

Tests are organized alongside the code they test:
- Unit tests: `*.test.ts` or `*.test.tsx`
- Component tests: `*.test.tsx`
- Service tests: `*.test.ts`

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Test Coverage Goals

- **Current Goal:** 50% coverage (thresholds in vitest.config.ts)
- **Target Goal:** 80%+ coverage
- **Critical Paths:** 100% coverage

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
  it('should perform action', () => {
    const result = myService.action();
    expect(result).toBe(expected);
  });
});
```

## Test Utilities

- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `vitest` - Test runner and assertions

## Mocking

- Next.js router: Mocked in `vitest.setup.ts`
- localStorage: Mocked in `vitest.setup.ts`
- API calls: Mock with `vi.mock()` or `vi.fn()`

## Best Practices

1. Test user behavior, not implementation details
2. Use descriptive test names
3. Keep tests isolated and independent
4. Mock external dependencies
5. Test error cases and edge cases
6. Aim for high coverage on critical paths

