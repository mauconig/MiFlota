import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Puerto fijo (no el 5173 por defecto de Vite) para que admin-web, admin-mobile
  // y driver puedan levantarse juntos sin pisarse. La API vive en 3000 y el
  // proxy hace que el cliente pueda pedir siempre a `/api` sin saber dónde está.
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // El panel de desarrollo también usa el backend compartido de la VPS.
      // Así no se crean datos en una API local por accidente.
      '/api': { target: 'https://miflota.147-93-180-120.sslip.io', changeOrigin: true, secure: true },
    },
  },
})
