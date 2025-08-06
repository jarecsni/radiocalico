# Multi-stage build for Radio Calico
# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Development image
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S radiocalico -u 1001

# Change ownership of the app directory
RUN chown -R radiocalico:nodejs /app
USER radiocalico

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
                 const req = http.request({hostname: 'localhost', port: 3000, path: '/', method: 'GET'}, \
                 (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
                 req.on('error', () => process.exit(1)); \
                 req.end();"

# Start development server with nodemon for hot reload
CMD ["npm", "run", "dev"]

# Stage 3: Test image
FROM development AS test

# Run tests
RUN npm test

# Stage 4: Production image
FROM base AS production

# Copy source code (excluding dev dependencies)
COPY --chown=node:node . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S radiocalico -u 1001

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R radiocalico:nodejs /app

# Switch to non-root user
USER radiocalico

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
                 const req = http.request({hostname: 'localhost', port: 3000, path: '/', method: 'GET'}, \
                 (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
                 req.on('error', () => process.exit(1)); \
                 req.end();"

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/users.db

# Start production server
CMD ["npm", "start"]