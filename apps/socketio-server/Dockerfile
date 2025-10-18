# syntax=docker/dockerfile:1

# Base stage with Node.js
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Prune stage - create a pruned monorepo for the socketio-server
FROM base AS pruner
COPY . .
RUN turbo prune socketio-server --docker

# Dependencies stage - install dependencies
FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Builder stage - build the application
FROM base AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY --from=deps /app/node_modules ./node_modules

# Build the socketio-server
RUN turbo run build --filter=socketio-server

# Runner stage - production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socketio

# Copy necessary files
COPY --from=builder /app/apps/socketio-server/package.json ./apps/socketio-server/
COPY --from=builder /app/apps/socketio-server/dist ./apps/socketio-server/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copy the node_modules from builder instead of reinstalling
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/socketio-server/node_modules ./apps/socketio-server/node_modules

USER socketio

EXPOSE 8000

ENV PORT=8000

CMD ["node", "./apps/socketio-server/dist/index.js"]
