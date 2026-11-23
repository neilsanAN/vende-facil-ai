FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y openssl ca-certificates fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @vendefacil/web build
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema packages/database/prisma/schema.prisma && pnpm --filter @vendefacil/web exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
