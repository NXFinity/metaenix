# Security Policy

## Supported Versions

We actively support the following versions of Meta EN|IX Backend with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Meta EN|IX Backend seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email**: Send details to [security@yourdomain.com] (replace with your actual security email)
2. **GitHub Security Advisory**: Use GitHub's private vulnerability reporting feature (if enabled)
3. **Private Contact**: Contact the maintainers directly through secure channels

### What to Include

When reporting a security vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: The potential impact of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: If possible, include a proof of concept or exploit code
- **Affected Versions**: Which versions are affected
- **Suggested Fix**: If you have a suggestion for fixing the issue

### What to Expect

After you submit a security report:

1. **Acknowledgment**: You will receive an acknowledgment within 48 hours
2. **Initial Assessment**: We will provide an initial assessment within 7 days
3. **Updates**: We will keep you informed of our progress
4. **Resolution**: We will work to resolve the issue as quickly as possible
5. **Disclosure**: We will coordinate disclosure with you after the fix is released

### Disclosure Policy

- We follow **responsible disclosure** practices
- We will credit you for the discovery (unless you prefer to remain anonymous)
- We will not disclose the vulnerability publicly until a fix is available
- We will work with you to coordinate public disclosure timing

## Security Best Practices

### For Users

- **Keep Updated**: Always use the latest supported version
- **Environment Variables**: Never commit `.env` files or expose secrets
- **Dependencies**: Regularly update dependencies (`npm audit`)
- **Database**: Use strong database credentials and restrict access
- **Redis**: Secure Redis instances and use authentication
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Configure appropriate rate limits for your use case
- **Monitoring**: Set up monitoring and alerting for security events

### For Developers

- **Input Validation**: Always validate and sanitize user input
- **Authentication**: Use proper authentication and authorization checks
- **Secrets Management**: Never hardcode secrets or API keys
- **Dependencies**: Regularly audit and update dependencies
- **Error Handling**: Avoid exposing sensitive information in error messages
- **SQL Injection**: Use parameterized queries (TypeORM QueryBuilder)
- **XSS Protection**: Sanitize HTML output and use Content Security Policy
- **CSRF Protection**: Enable CSRF protection in production
- **Security Headers**: Use Helmet middleware for security headers

## Security Features

Meta EN|IX Backend includes the following security features:

- ✅ **Authentication**: Session-based and JWT authentication
- ✅ **Authorization**: Role-Based Access Control (RBAC)
- ✅ **Rate Limiting**: Global and endpoint-specific rate limiting
- ✅ **Input Validation**: Comprehensive DTO validation with sanitization
- ✅ **Password Security**: Bcrypt hashing with configurable salt rounds
- ✅ **SQL Injection Prevention**: Parameterized queries via TypeORM
- ✅ **XSS Protection**: HTML sanitization and CSP headers
- ✅ **Security Headers**: Helmet middleware integration
- ✅ **CORS**: Configurable CORS policies
- ✅ **Error Handling**: Generic error messages to prevent information leakage
- ✅ **Audit Logging**: Comprehensive audit trail for security events
- ✅ **Session Security**: Redis-backed secure session storage

## Known Security Considerations

### Development vs Production

- **Seeding**: Database seeding only runs in development mode
- **Swagger**: API documentation is disabled in production by default
- **Synchronize**: Database synchronization should be disabled in production after initial setup
- **Logging**: Sensitive data is excluded from logs

### Configuration

- All configuration is validated via Joi schema on startup
- Environment variables are required and validated
- Default values are secure but should be customized for production

## Security Updates

- **Critical**: Patched immediately and released as soon as possible
- **High**: Patched within 7 days
- **Medium**: Patched within 30 days
- **Low**: Addressed in the next regular release cycle

## Security Audit

This project undergoes regular security audits. See `docs/backend/AUDIT_REPORT.md` for details on security improvements and resolved issues.

## Contact

For security-related questions or concerns:

- **Security Issues**: [security@yourdomain.com] (replace with your actual security email)
- **General Questions**: Open a GitHub issue (non-security)
- **Documentation**: See `docs/backend/` for security documentation

## Acknowledgments

We appreciate the security research community's efforts to help keep Meta EN|IX Backend secure. Security researchers who responsibly disclose vulnerabilities will be credited (unless they prefer anonymity).

---

**Last Updated**: 2025-01-14  
**Version**: 1.0.0

