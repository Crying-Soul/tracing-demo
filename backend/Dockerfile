FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

FROM base AS development
RUN npm ci --include=dev
COPY . .
CMD ["npm", "run", "start:dev"]

FROM base AS builder
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "--import", "./dist/tracing.js", "dist/main"]
