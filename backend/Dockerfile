# Build from the REPOSITORY ROOT (the lockfile and the shared workspace package live there):
#
#   docker build -f backend/Dockerfile -t localsampark-api .
#
# The previous version built from backend/ alone, where there is no package-lock.json
# (npm ci refuses to run) and no packages/shared (a declared dependency), and its
# `COPY . .` also copied .env files and local SQLite databases into the image.

# ── Stage 1: production dependencies, resolved from the root lockfile ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci validates every workspace listed in the lockfile, so each one's manifest must be present.
COPY packages ./packages
COPY backend/package.json ./backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false

# ── Stage 2: runtime ──
FROM node:20-alpine
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=deps --chown=node:node /app/node_modules /app/node_modules
COPY --from=deps --chown=node:node /app/packages /app/packages
COPY --chown=node:node backend/ /app/backend/
USER node
EXPOSE 5000
# busybox wget ships with alpine; curl does not.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health >/dev/null || exit 1
# dumb-init forwards SIGTERM so the server's graceful-shutdown handler runs.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
