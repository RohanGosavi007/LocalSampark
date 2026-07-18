FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and lockfile if using workspaces
# However, for isolated Next.js app:
COPY package.json ./
RUN npm install

COPY . .

# Build the Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# You only need these in production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
