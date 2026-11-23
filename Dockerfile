# Production Dockerfile for ANGKON Next.js on Coolify / Docker
FROM node:22-alpine AS runner

# Install curl, wget, and libc6-compat for healthcheck and runtime compatibility
RUN apk add --no-cache curl wget libc6-compat

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy project files
COPY . .

# Production build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Build Next.js application
RUN npm run build

# Expose production port 3000
EXPOSE 3000

# Container Healthcheck verifying http://localhost:3000/api/health
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || wget -qO- http://localhost:3000/api/health || exit 1

# Run Next.js on 0.0.0.0:3000
CMD ["npm", "run", "start"]
