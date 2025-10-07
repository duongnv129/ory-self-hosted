FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install pnpm if lock file exists, otherwise use npm
RUN if [ -f pnpm-lock.yaml ]; then \
  npm install -g pnpm && pnpm install --no-frozen-lockfile; \
  else \
  npm ci; \
  fi

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build the TypeScript application
RUN if [ -f pnpm-lock.yaml ]; then \
  pnpm run build; \
  else \
  npm run build; \
  fi

# Remove dev dependencies and source files to reduce image size
RUN if [ -f pnpm-lock.yaml ]; then \
  pnpm prune --prod; \
  else \
  npm prune --production; \
  fi && \
  rm -rf src/ tsconfig.json

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
