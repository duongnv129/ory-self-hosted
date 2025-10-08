# Use the official Node.js 18 Alpine image for smaller image size
FROM node:18-alpine AS base

# Install pnpm globally for dependency management
RUN npm install -g pnpm

# Create and change to the app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application for production
RUN pnpm build

# Production stage - Use a minimal node image
FROM node:18-alpine AS production

# Create and change to the app directory
WORKDIR /app

# Copy the standalone output from the base stage
COPY --from=base /app/.next/standalone ./ 
COPY --from=base /app/.next/static ./.next/static

# Expose port 3000 to allow communication to/from the Next.js app
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Run the application using the standalone server
CMD ["node", "server.js"]