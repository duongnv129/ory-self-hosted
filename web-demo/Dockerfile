# Dependencies stage - Install all dependencies
FROM node:24-alpine AS deps

# Install libc6-compat for Next.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm using corepack (faster than npm install -g)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with optimizations
RUN pnpm install --frozen-lockfile --prefer-offline

# Builder stage - Build the application
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm using corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy application source
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Set Next.js telemetry to disabled for faster builds
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application for production
RUN pnpm build

# Production stage - Minimal runtime image
FROM node:24-alpine AS production

# Install libc6-compat for Next.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy public assets from builder (if any)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy standalone output and static files from builder
# Next.js automatically copies only necessary files to standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Run the application using the standalone server
CMD ["node", "server.js"]