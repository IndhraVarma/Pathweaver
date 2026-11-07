# syntax=docker/dockerfile:1

# --- Stage 1: install every workspace dependency, including dev -------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

# --- Stage 2: build the client bundle --------------------------------------
FROM deps AS build
WORKDIR /app

COPY shared ./shared
COPY client ./client

RUN npm run build

# --- Stage 3: production image ---------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
# Scenarios and run statistics live here; mount a volume to keep them.
ENV DATA_FILE=/data/store.json

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Production dependencies only — the client is already built.
RUN npm ci --omit=dev && npm cache clean --force

COPY shared ./shared
COPY server ./server
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
