FROM node:lts AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:lts AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL

ENV NODE_ENV=production
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY ./ .
COPY --from=dependencies /app/node_modules ./node_modules

RUN npm run build

FROM node:lts AS runner
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL

ENV NODE_ENV=production
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV HOSTNAME="0.0.0.0"
# Cloud Run injects PORT.
EXPOSE 8080

# Run the Next.js binary directly. Going through `npm run` would add an npm
# process in front of it that only forwards signals and arguments.
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -p \"${PORT:-8080}\" -H 0.0.0.0"]
