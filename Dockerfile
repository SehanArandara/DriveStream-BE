# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production deps first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: Builder (for any build steps / TS compile if added later) ──────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Placeholder for future build step (TypeScript, bundler, etc.)
# RUN npm run build

# ─── Stage 3: Production Image ───────────────────────────────────────────────
FROM node:20-alpine AS runner

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.title="DriveStream Server" \
      org.opencontainers.image.description="DriveStream Vehicle Service Management API" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

# Security: run as non-root user
RUN addgroup --system --gid 1001 drivestream && \
    adduser  --system --uid 1001 --ingroup drivestream drivestream

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=drivestream:drivestream /app/node_modules ./node_modules

# Copy application source
COPY --chown=drivestream:drivestream . .

# Remove dev/CI files not needed at runtime
RUN rm -rf test tests __tests__ .github .eslintrc* jest.config* *.test.js

# Create upload directory with correct permissions
RUN mkdir -p uploads && chown drivestream:drivestream uploads

USER drivestream

EXPOSE 5000

ENV NODE_ENV=production \
    PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/index.js"]