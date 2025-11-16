# Test Suite Documentation

## Overview

This directory contains the comprehensive test suite for the Meta EN|IX Backend.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual services, controllers, etc.
│   ├── auth/
│   ├── users/
│   ├── posts/
│   ├── follows/
│   └── twofa/
├── integration/       # Integration tests for API endpoints
│   ├── auth/
│   ├── users/
│   ├── posts/
│   ├── follows/
│   └── twofa/
├── e2e/               # End-to-end tests for complete flows
│   ├── authentication.spec.ts
│   ├── twofa-flow.spec.ts
│   └── posts-flow.spec.ts
├── security/          # Security-focused tests
│   ├── authorization.spec.ts
│   ├── input-validation.spec.ts
│   └── rate-limiting.spec.ts
└── fixtures/          # Test data fixtures
    ├── users.fixture.ts
    ├── posts.fixture.ts
    └── collections.fixture.ts
```

## Running Tests

### All Tests
```bash
npm run test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Security Tests Only
```bash
npm run test:security
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:cov
```

## Test Categories

### Unit Tests
- Test individual functions/methods in isolation
- Mock dependencies
- Fast execution
- High coverage target: 80%+

### Integration Tests
- Test API endpoints with database
- Test service interactions
- Use test database
- Medium execution time

### E2E Tests
- Test complete user flows
- Test multiple services together
- Use test database
- Slower execution

### Security Tests
- Test authorization checks
- Test input validation
- Test rate limiting
- Test SQL injection prevention
- Test XSS prevention

## Test Coverage Goals

- **Overall Coverage:** 80%+
- **Critical Paths:** 100%
- **Security Features:** 100%
- **2FA Implementation:** 100%
- **Authorization:** 100%

## Writing Tests

### Example Unit Test
```typescript
describe('TwofaService', () => {
  let service: TwofaService;
  let securityRepository: Repository<Security>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwofaService,
        // ... mocks
      ],
    }).compile();

    service = module.get<TwofaService>(TwofaService);
  });

  it('should generate TOTP secret', async () => {
    // Test implementation
  });
});
```

### Example Integration Test
```typescript
describe('POST /twofa/setup', () => {
  it('should setup 2FA and return QR code', async () => {
    const response = await request(app.getHttpServer())
      .post('/twofa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' })
      .expect(201);

    expect(response.body).toHaveProperty('qrCode');
    expect(response.body).toHaveProperty('secret');
  });
});
```

## Test Data

- Use fixtures for consistent test data
- Clean up test data after each test
- Use factories for generating test data

## Best Practices

1. **Isolation:** Each test should be independent
2. **Naming:** Use descriptive test names
3. **Arrange-Act-Assert:** Follow AAA pattern
4. **Mocking:** Mock external dependencies
5. **Cleanup:** Clean up test data
6. **Speed:** Keep tests fast
7. **Coverage:** Aim for high coverage on critical paths

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

## Reporting

Test results are available in:
- Console output
- Coverage reports (`coverage/`)
- CI/CD logs

