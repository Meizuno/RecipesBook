FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production
FROM base AS production
COPY --from=build /app/.output ./.output
COPY --from=deps /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./.output/server/node_modules/.prisma
COPY prisma ./prisma/

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
