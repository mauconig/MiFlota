# MiFlota

Gestión de una flota de vehículos: ingresos y egresos por vehículo, choferes,
alertas de mantenimiento/documentación, reportes de movimientos y cobros.
React + TypeScript + Vite en el frontend, Fastify + SQLite en el backend.

## Estructura

Monorepo con tres frontends y un backend independiente que los tres comparten:

- `apps/admin-web` — panel de escritorio para el dueño (PC). Es la app
  original y hoy la única con pantallas completas. Workspace npm.
- `apps/admin-mobile` — app Expo/React Native para el celular del dueño.
  No es un workspace npm: React Native exige una versión exacta de `react`
  (distinta de la que usan los frontends web) y mezclar ambas en el mismo
  árbol de resolución de npm termina duplicando `react` en el bundle. Tiene
  su propio `node_modules`/`package-lock.json`, igual que `apps/api`.
- `apps/driver` — app para choferes (ver su deuda, registrar pagos, subir
  comprobantes). Todavía vacía (placeholder). Workspace npm.
- `apps/api` — backend Fastify + SQLite compartido por los tres frontends.
  No es un workspace npm: tiene una dependencia nativa (`better-sqlite3`) y
  gestiona su propio `node_modules`/`package-lock.json` por separado.

Dentro de `apps/admin-web`:

- `src/data.ts` — generador de datos de ejemplo (flota + movimientos)
- `src/useFleetView.ts` — estado de la UI y toda la lógica derivada (KPIs, filtros, orden, alertas, paginación)
- `src/screens/` — las seis pantallas (Resumen, Vehículos, Choferes, Alertas, Reportes, Cobros)
- `src/components/` — sidebar, header, tabla de vehículos, drawer de detalle, modales y toast

## Desarrollo

```bash
npm install                        # instala admin-web y driver (workspaces)
cd apps/api && npm install         # instala el backend por separado
cd apps/admin-mobile && npm install   # instala admin-mobile por separado

npm run dev:api       # backend en :3000
npm run dev            # admin-web en :5173 (alias de dev:admin-web)
npm run dev:admin-mobile   # Expo (Metro en :8081)
npm run dev:driver         # :5176
```

Los tres frontends proxean `/api` hacia `http://127.0.0.1:3000`, así que el
backend tiene que estar corriendo para que cualquiera de ellos funcione contra
datos reales.

## Build

```bash
npm run build          # admin-web (el único que se empaqueta en Docker hoy)
npm run build:api      # backend
```

`admin-mobile` y `driver` tienen su propio `npm run build -w <app>` una vez
que tengan pantallas reales; el Dockerfile todavía no los incluye en la
imagen de producción.
