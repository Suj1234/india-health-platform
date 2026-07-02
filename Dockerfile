# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Provide placeholder values so `next build` can resolve env-validated imports.
# Real values are injected at runtime via `docker run -e` or an env file.
# Only NEXTAUTH_SECRET and NEXTAUTH_URL are required by NextAuth at build time.
ENV NEXTAUTH_SECRET=build_placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgres://placeholder

RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Static assets served by the Next.js standalone server
COPY --from=builder /app/public ./public

# Standalone server bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Must be 0.0.0.0 — Next.js standalone defaults to 127.0.0.1 which is unreachable inside Docker
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
