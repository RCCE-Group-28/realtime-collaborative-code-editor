# syntax=docker/dockerfile:1

# Base stage with Node.js
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Prune stage - create a pruned monorepo for the yjs-server
FROM base AS pruner
COPY . .
RUN turbo prune yjs-server --docker

# Dependencies stage - install dependencies
FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Runner stage - production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 yjs

# Copy necessary files
COPY --from=deps /app/apps/yjs-server/package.json ./
COPY --from=deps /app/node_modules ./node_modules

USER yjs

EXPOSE 1234

ENV PORT=1234
ENV HOST=0.0.0.0

CMD ["npx", "y-websocket"]
