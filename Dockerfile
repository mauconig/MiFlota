# syntax=docker/dockerfile:1

# ---------- 1. build del frontend ----------
# Solo admin-web se empaqueta hoy: admin-mobile y driver todavía están vacíos.
# El workspace root exige que existan los package.json de los tres para poder
# resolver, aunque acá no se construyan.
FROM node:22-bookworm-slim AS front
WORKDIR /app
COPY package.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/admin-mobile/package.json apps/admin-mobile/package.json
COPY apps/driver/package.json apps/driver/package.json
# Sin package-lock.json a propósito: el que se versiona se genera en Windows,
# y un install que lo respete no trae el binding nativo de rolldown (usado
# por Vite) para linux-x64 (npm/cli#4828). Sin lockfile, npm resuelve fresco
# para la plataforma del contenedor.
RUN npm install
COPY apps/admin-web ./apps/admin-web
RUN npm run build -w admin-web

# ---------- 2. build del servidor ----------
# apps/api no es parte del workspace: tiene un módulo nativo (better-sqlite3)
# y necesita su propio install prod-only, sin arrastrar deps del frontend.
# better-sqlite3 trae binarios precompilados, pero si no hay uno para esta
# plataforma cae a compilar desde fuente y necesita toolchain.
FROM node:22-bookworm-slim AS api
WORKDIR /srv
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install --omit=dev && cp -R node_modules /tmp/node_modules_prod && npm install
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
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
COPY --from=front /app/apps/admin-web/dist ./public

# La base vive en un volumen, no en la capa de imagen: reconstruir la imagen no
# debe borrar los datos.
RUN mkdir -p /data && chown -R node:node /data /srv
VOLUME ["/data"]
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=8s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
