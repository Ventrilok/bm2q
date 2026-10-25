FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies only (no tsx, typescript, eslint...)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Root-owned, world-readable app files. `.next` belongs to `node` because
# Next writes its cache (e.g. optimised images) there at runtime.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" > /dev/null || exit 1

# Run node directly (not via npm) so it receives SIGTERM and stops promptly.
CMD ["node", "dist/server.js"]
