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
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
