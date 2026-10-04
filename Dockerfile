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

# Build both Next.js and Mastra server
RUN npm run build

FROM node:lts AS runner
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL

ENV NODE_ENV=production
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV MASTRA_API_URL=http://localhost:4000
ENV MASTRA_PORT=4000

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/mastra-server ./mastra-server
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/src ./src

# Make start script executable
RUN chmod +x start.sh

ENV HOSTNAME="0.0.0.0"
# Cloud Run injects PORT; Mastra runs internally on 4000.
EXPOSE 8080

CMD ["npm", "run", "start"]
