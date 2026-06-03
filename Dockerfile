# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# Install all dependencies and compile the frontend + server
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps needed for build tools like vite/esbuild)
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Build:
#   1. vite build   → compiles React SPA into dist/
#   2. esbuild      → compiles server.ts into dist/server.mjs
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production dependencies only
# Install only runtime deps in a clean layer
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Runtime
# Lean final image — only the compiled artifacts + production node_modules
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled frontend + server from builder stage
COPY --from=builder /app/dist ./dist

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json (needed for "type": "module" resolution)
COPY package.json ./

# Run as non-root
USER appuser

# Expose the production port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck — hits the /api/health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Start the Express server (serves both API + static frontend)
CMD ["node", "dist/server.mjs"]
