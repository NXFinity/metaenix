# Security Policy

## Supported Versions

The following versions of the project are currently supported with security updates:

| Version | Supported |
|--------|-----------|
| Latest | Yes       |
| Older releases | No |

Please ensure you are always running the most recent version of the software.

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public issue**.

Instead, please report it privately via:

**security@metaenix.com**

When reporting a vulnerability, please include:

- A clear description of the issue  
- Steps to reproduce  
- Impact assessment (if known)  
- Any logs, screenshots, or proof-of-concept code  
- Suggested fixes (optional)

We aim to acknowledge all reports within **48 hours** and provide a status update within **5 business days**.

## Disclosure Policy

- Valid security issues will be investigated immediately.  
- We may request additional information to reproduce or confirm the vulnerability.  
- Fixes for critical vulnerabilities will be prioritised and patched as quickly as possible.  
- Public disclosure will occur **only after a fix is released**, or when agreed upon with the reporter.  
- Credit will be given to responsible reporters unless anonymity is requested.

## Scope

The following areas are considered in-scope:

- Meta EN|IX backend services (API, auth, accounts, chat, marketplace, analytics, etc.)
- Frontend applications (Next.js portal, docs site, dashboards)
- Infrastructure and deployment configuration
- Containerised services and microservices
- WebSocket services and real-time systems

Out-of-scope issues include:

- User-hosted or modified deployments
- Issues caused by unsupported or outdated dependencies
- Social engineering attacks targeting contributors

## Security Best Practices for Contributors

Contributors are expected to:

- Avoid committing credentials, access tokens, or secrets  
- Use environment variables instead of hard-coded configuration  
- Follow secure coding guidelines  
- Keep dependencies up to date and report risky packages  
- Avoid introducing breaking changes to authentication or permission systems  
- Use HTTPS and secure communication protocols whenever applicable

## Responsible Use

This project may not be used for:

- Malicious activity  
- Unauthorised access attempts  
- Circumventing security controls  
- Automated attacks or exploitation testing without explicit consent

Violations may result in revocation of access or reporting to appropriate authorities if necessary.
