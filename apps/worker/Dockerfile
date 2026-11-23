FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y ffmpeg openssl ca-certificates fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
EXPOSE 3001
CMD ["pnpm", "--filter", "@vendefacil/worker", "exec", "tsx", "src/index.ts"]
