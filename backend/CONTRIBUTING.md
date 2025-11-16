# Contributing to Meta EN|IX Backend

Thank you for your interest in contributing to Meta EN|IX Backend! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Security](#security)
- [Questions?](#questions)

---

## 📜 Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Show empathy towards other community members

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** v18+ installed
- **PostgreSQL** 12+ installed and running
- **Redis** 6+ installed and running
- **npm** or **yarn** package manager
- **Git** for version control
- Basic knowledge of **TypeScript** and **NestJS**

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/enix_backend.git
   cd enix_backend/backend
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/NXFinity/enix_backend.git
   ```

---

## 💻 Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.development` file based on `.env.example`:

```bash
cp .env.example .env.development
```

Configure the following required variables:

- Database credentials (PostgreSQL)
- Redis connection details
- JWT secrets
- Session secret
- Digital Ocean Spaces credentials (for file storage)
- SMTP settings (for email)

### 3. Database Setup

Ensure PostgreSQL is running and create the development database:

```sql
CREATE DATABASE enix_dev;
```

The database will auto-sync in development mode (`synchronize: true`).

### 4. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3021/v1`  
Swagger documentation: `http://localhost:3021/v1` (development only)

---

## 🏗️ Project Structure

Understanding the project structure is essential for contributing:

```
backend/
├── src/
│   ├── common/              # Shared utilities and interfaces
│   │   ├── constants/       # Application constants
│   │   ├── dto/             # Shared DTOs
│   │   └── interfaces/      # TypeScript interfaces
│   ├── config/              # Configuration files
│   ├── filters/             # Exception filters
│   ├── functions/           # Utility functions
│   ├── rest/
│   │   ├── api/
│   │   │   └── users/       # User management module
│   │   ├── storage/         # File storage module
│   │   └── websocket/       # WebSocket gateway
│   ├── security/
│   │   ├── auth/           # Authentication module
│   │   └── roles/           # RBAC module
│   ├── services/
│   │   ├── health/          # Health check service
│   │   └── startup/         # Startup service
│   └── utils/              # Utility functions
├── libs/                    # Shared libraries
│   ├── caching/            # Caching service
│   ├── database/           # Database utilities
│   ├── email/              # Email service
│   ├── kafka/              # Kafka integration
│   ├── logging/            # Logging service
│   ├── redis/              # Redis service
│   └── throttle/          # Rate limiting
└── test/                    # E2E tests
```

### Key Principles

- **Modularity**: Each feature should be self-contained in its module
- **Separation of Concerns**: Controllers handle HTTP, Services handle business logic
- **Reusability**: Shared functionality goes in `libs/`
- **Type Safety**: Use TypeScript interfaces and types throughout

---

## 📝 Coding Standards

### TypeScript

- Use **strict TypeScript** mode
- Always define types and interfaces
- Use `const` instead of `let` when possible
- Prefer arrow functions for callbacks
- Use async/await instead of Promises chains

### Naming Conventions

- **Files**: Use kebab-case (e.g., `user.service.ts`, `auth.guard.ts`)
- **Classes**: Use PascalCase (e.g., `UsersService`, `AuthGuard`)
- **Variables/Functions**: Use camelCase (e.g., `getUserById`, `userId`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `SESSION_MAX_AGE_MS`)
- **Interfaces**: Use PascalCase with descriptive names (e.g., `AuthenticatedRequest`)

### Code Style

- **Indentation**: 2 spaces (configured in `.editorconfig`)
- **Line Endings**: LF (Unix-style)
- **Max Line Length**: 120 characters
- **Trailing Commas**: Use in multi-line objects/arrays
- **Semicolons**: Always use semicolons

### Example Code Structure

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LoggingService } from '@logging/logging';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }
}
```

### Best Practices

1. **Early Returns**: Use early returns to reduce nesting
2. **Error Handling**: Always handle errors appropriately
3. **Input Validation**: Validate and sanitize all user inputs
4. **Logging**: Use `LoggingService` for structured logging
5. **Caching**: Use `CachingService` for frequently accessed data
6. **Transactions**: Use database transactions for multi-step operations
7. **Type Safety**: Use `AuthenticatedRequest` and `AuthenticatedSocket` interfaces

---

## 🔧 Code Quality Tools

### ESLint

Run linting before committing:

```bash
npm run lint
```

ESLint will automatically fix many issues:

```bash
npm run lint -- --fix
```

### Prettier

Format code with Prettier:

```bash
npm run format
```

### Type Checking

Ensure TypeScript compiles without errors:

```bash
npm run build
```

---

## 📤 Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security fixes

### Scopes

- `auth`: Authentication module
- `users`: User management
- `posts`: Posts system
- `storage`: File storage
- `websocket`: WebSocket gateway
- `security`: Security features
- `config`: Configuration
- `deps`: Dependencies

### Examples

```bash
feat(posts): add bookmark functionality

Add ability for users to bookmark posts for later viewing.
Includes bookmark entity, service methods, and API endpoints.

Closes #123

fix(auth): resolve session expiration issue

The session was expiring prematurely due to incorrect TTL calculation.

refactor(caching): improve cache invalidation strategy

Use tag-based invalidation instead of key-based for better performance.

docs(readme): update installation instructions

Add Docker setup instructions and environment variable examples.
```

### Commit Best Practices

- Write clear, descriptive commit messages
- Keep commits focused (one logical change per commit)
- Reference issue numbers when applicable
- Test your changes before committing
- Ensure code passes linting and type checking

---

## 🔀 Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes**:
   - Write clean, tested code
   - Follow coding standards
   - Update documentation if needed
   - Add tests for new features

4. **Test your changes**:
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

### Pull Request Checklist

- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] Code is properly typed (TypeScript)
- [ ] No linting errors
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`
- [ ] No merge conflicts

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Writing Tests

- Write tests for new features
- Aim for high code coverage
- Test edge cases and error scenarios
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Example Test

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should find a user by id', async () => {
    const user = { id: '1', username: 'test' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);

    const result = await service.findOne('1');

    expect(result).toEqual(user);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
```

---

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public methods
- Document complex logic and algorithms
- Explain "why" not just "what"
- Keep comments up to date with code changes

### Example

```typescript
/**
 * Find a user by their unique identifier
 * 
 * @param id - The user's unique identifier
 * @returns The user entity if found
 * @throws NotFoundException if user doesn't exist
 */
async findOne(id: string): Promise<User> {
  // Implementation
}
```

### API Documentation

- Update Swagger documentation for API changes
- Add examples to DTOs
- Document error responses
- Include authentication requirements

---

## 🔒 Security

### Security Guidelines

1. **Never commit secrets**: Use environment variables
2. **Sanitize inputs**: Always sanitize user inputs
3. **Validate data**: Validate all incoming data
4. **Use parameterized queries**: Prevent SQL injection
5. **Hash passwords**: Never store plain text passwords
6. **Rate limiting**: Implement rate limiting for sensitive endpoints
7. **Error messages**: Don't expose sensitive information in errors

### Reporting Security Issues

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email security concerns to: [security@example.com]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

---

## 🎯 Contribution Areas

We welcome contributions in these areas:

### High Priority

- **Bug Fixes**: Fix reported bugs and issues
- **Performance**: Optimize slow queries and operations
- **Security**: Improve security measures
- **Documentation**: Improve and expand documentation

### Medium Priority

- **New Features**: Add requested features
- **Code Quality**: Refactor and improve code
- **Testing**: Increase test coverage
- **Type Safety**: Improve TypeScript types

### Nice to Have

- **Examples**: Add usage examples
- **Tutorials**: Create tutorials and guides
- **Translations**: Translate documentation
- **UI Improvements**: Improve Swagger UI

---

## ❓ Questions?

- **Discord**: [Join our Discord server](https://discord.gg/ThCJ6mbaH8)
- **GitHub Issues**: [Open an issue](https://github.com/NXFinity/enix_backend/issues)
- **GitHub Discussions**: [Start a discussion](https://github.com/NXFinity/enix_backend/discussions)
- **Wiki**: [Check the wiki](https://github.com/NXFinity/enix_backend/wiki)

---

## 🙏 Thank You!

Thank you for taking the time to contribute to Meta EN|IX Backend! Your contributions help make this project better for everyone.

---

**Happy Coding! 🚀**

