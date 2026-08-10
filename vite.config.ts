import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En desarrollo el front corre en 5173 y la API en 3000; el proxy hace que el
  // cliente pueda pedir siempre a `/api` sin saber dónde está el backend.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
