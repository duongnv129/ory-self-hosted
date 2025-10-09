# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm globally (cache this layer)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies with optimizations
RUN if [ -f pnpm-lock.yaml ]; then \
    pnpm install --frozen-lockfile --prefer-offline; \
  elif [ -f package-lock.json ]; then \
    npm ci --prefer-offline --no-audit; \
  else \
    npm install --no-audit; \
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

# Install pnpm globally (cache this layer)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for production dependency installation
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install only production dependencies with optimizations
RUN if [ -f pnpm-lock.yaml ]; then \
    pnpm install --prod --frozen-lockfile --prefer-offline; \
  elif [ -f package-lock.json ]; then \
    npm ci --omit=dev --prefer-offline --no-audit; \
  else \
    npm install --omit=dev --no-audit; \
  fi && \
  # Clean npm cache to reduce image size
  if [ -f pnpm-lock.yaml ]; then \
    pnpm store prune; \
  else \
    npm cache clean --force; \
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
