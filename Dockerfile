# syntax=docker/dockerfile:1

# ---------- 1. build del frontend ----------
FROM node:22-bookworm-slim AS front
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- 2. build del servidor ----------
# better-sqlite3 trae binarios precompilados, pero si no hay uno para esta
# plataforma cae a compilar desde fuente y necesita toolchain.
FROM node:22-bookworm-slim AS api
WORKDIR /srv
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev && cp -R node_modules /tmp/node_modules_prod && npm install
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx tsc -p tsconfig.json

# ---------- 3. runtime ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    MIFLOTA_DB=/data/miflota.db \
    MIFLOTA_PUBLIC=/srv/public
WORKDIR /srv

COPY --from=api /tmp/node_modules_prod ./node_modules
COPY --from=api /srv/dist ./dist
COPY --from=api /srv/package.json ./package.json
COPY --from=front /app/dist ./public

# La base vive en un volumen, no en la capa de imagen: reconstruir la imagen no
# debe borrar los datos.
RUN mkdir -p /data && chown -R node:node /data /srv
VOLUME ["/data"]
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=8s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
