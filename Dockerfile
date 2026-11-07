FROM node:22-bookworm-slim

ARG NEXT_PUBLIC_BACKEND_URL=https://vibeschedule.vibelabs.to/api
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx curl ca-certificates openssl python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY apps/cli/package.json apps/cli/
COPY libraries/nestjs-libraries/src/database/prisma/schema.prisma libraries/nestjs-libraries/src/database/prisma/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run prisma-generate \
 && NODE_OPTIONS=--max-old-space-size=4096 pnpm run build

COPY docker/nginx.conf /etc/nginx/nginx.conf
RUN chmod +x docker/start.sh

ENV NODE_ENV=production \
    PATH=/app/node_modules/.bin:$PATH
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5000/api/ >/dev/null || exit 1

CMD ["docker/start.sh"]
