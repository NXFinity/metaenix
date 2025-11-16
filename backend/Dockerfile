# Multi-stage build for NestJS backend
# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and libraries
COPY src ./src
COPY libs ./libs

# Build the application (this builds both src and all libs)
RUN npm run build

# Verify libraries were built
RUN ls -la dist/libs/ || echo "Warning: libs directory not found"

# Stage 2: Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage (includes src and libs)
# The dist folder structure after build:
#   dist/
#     src/          # Main application code
#     libs/         # Built libraries (caching, database, email, kafka, logging, redis, throttle)
#       caching/
#       database/
#       email/
#       kafka/
#       logging/
#       redis/
#       throttle/
COPY --from=builder /app/dist ./dist

# Verify libs were copied successfully
RUN ls -la dist/libs/ && echo "Libraries copied successfully"

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3021

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3021/v1/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/main.js"]

