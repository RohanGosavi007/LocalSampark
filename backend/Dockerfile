# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Production
FROM node:20-alpine
# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app
# Run as non-root user
USER node

# Copy dependencies and application code
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app ./

EXPOSE 5000

# Use dumb-init to reap zombie processes and forward signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
