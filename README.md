# Sikka Flota — Dashboard Web

Panel del dueño para gestión de una flota de vehículos: ingresos y egresos por
vehículo, choferes, alertas de mantenimiento/documentación, reportes de
movimientos y cobros pendientes. React + TypeScript + Vite.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Estructura

- `src/data.ts` — generador de datos de ejemplo (flota + movimientos)
- `src/useFleetView.ts` — estado de la UI y toda la lógica derivada (KPIs, filtros, orden, alertas, paginación)
- `src/screens/` — las seis pantallas (Resumen, Vehículos, Choferes, Alertas, Reportes, Cobros pendientes)
- `src/components/` — sidebar, header, tabla de vehículos, drawer de detalle, modales y toast
