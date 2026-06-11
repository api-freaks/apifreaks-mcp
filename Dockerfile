FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json tsup.config.ts ./

COPY src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

COPY package*.json ./

RUN npm ci --omit=dev

ENTRYPOINT ["node", "dist/index.js"]
