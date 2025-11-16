# Meta EN|IX Backend

**Version:** 1.4.0  
**Framework:** NestJS v11.0.1  
**Database:** PostgreSQL with TypeORM  
**Status:** ✅ Production Ready

---

## 🎯 Overview

Meta EN|IX Backend is a production-ready NestJS application providing comprehensive user management, authentication, authorization, platform services, and **Developer API access** with enterprise-grade security practices.

**Key Features:**
- ✅ Two-Factor Authentication (2FA) with TOTP
- ✅ **OAuth 2.0 Developer System** (NEW in v1.4.0)
- ✅ Performance and security monitoring
- ✅ Role-based access control (RBAC)
- ✅ WebSocket support for real-time communication
- ✅ File storage with Digital Ocean Spaces
- ✅ Comprehensive API documentation

---

## 📚 Documentation

**Full documentation is available at:** [https://nxfinity.github.io/enix_backend/](https://nxfinity.github.io/enix_backend/)

The documentation includes:
- Getting Started guide
- Developer API documentation
- OAuth 2.0 authentication
- API reference (Users, Posts, Storage)
- WebSocket event subscriptions
- Error handling and rate limits
- Best practices and troubleshooting

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL 12+
- Redis 6+
- Digital Ocean Spaces account (or S3-compatible storage)

### Installation

1. **Clone and install**
```bash
git clone <repository-url>
cd backend
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development server**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3021/v1`  
Swagger documentation: `http://localhost:3021/v1` (development only)

---

## 🛠 Tech Stack

- **NestJS** v11.0.1 - Progressive Node.js framework
- **TypeScript** v5.7.3 - Type-safe JavaScript
- **PostgreSQL** - Relational database
- **TypeORM** v0.3.27 - ORM for database operations
- **Redis** (ioredis) - Session store and caching
- **Socket.IO** - WebSocket support

---

## 💻 Development

### Available Scripts

```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run start:prod     # Start production server
npm run lint           # Run ESLint
npm run test           # Run tests
```

---

## 🐳 Docker

### Docker Hub

**Image:** [oneorg/balpha](https://hub.docker.com/r/oneorg/balpha)  
**The Docker Image, is two builds behind the repo build**

### Pull and Run

```bash
docker pull oneorg/balpha
docker run -p 3021:3021 --env-file .env.production oneorg/balpha
```

---

## 🚢 Production Deployment

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `synchronize=false` in database config
- [ ] Configure all required environment variables
- [ ] Set up Redis connection
- [ ] Configure SMTP settings
- [ ] Configure Digital Ocean Spaces credentials
- [ ] Set secure session secret
- [ ] Configure CORS origins
- [ ] Set up health check monitoring

### Build & Deploy

```bash
npm run build
npm run start:prod
```

---

## 📝 Additional Resources

- **API Documentation:** [https://nxfinity.github.io/enix_backend/](https://nxfinity.github.io/enix_backend/)
- **Project Website:** [https://metaenix.com](https://metaenix.com)
- **Discord:** [https://discord.gg/ThCJ6mbaH8](https://discord.gg/ThCJ6mbaH8)

---

## 📄 License

UNLICENSED - Proprietary software

---

**Last Updated:** 16/11/2025  
**Version:** 1.4.0  
**Status:** ✅ Production Ready
