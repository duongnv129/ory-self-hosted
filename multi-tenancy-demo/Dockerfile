# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN if [ -f pnpm-lock.yaml ]; then \
  npm install -g pnpm && pnpm install --no-frozen-lockfile; \
  else \
  npm ci; \
  fi

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript application
RUN if [ -f pnpm-lock.yaml ]; then \
  pnpm run build; \
  else \
  npm run build; \
  fi

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install only production dependencies
RUN if [ -f pnpm-lock.yaml ]; then \
  npm install -g pnpm && pnpm install --prod --no-frozen-lockfile; \
  else \
  npm ci --only=production; \
  fi

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

# Start the application
CMD ["npm", "start"]
