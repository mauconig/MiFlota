import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Agent } from 'node:https'
import type { LookupFunction } from 'node:net'

// El backend público vive en la VPS. La red local de desarrollo no resuelve el
// dominio (el DNS del router falla para la zona), así que el proxy resuelve el
// host por su cuenta: mantiene el Host/SNI del dominio, así el TLS sigue
// validando, y no depende del DNS de la máquina.
const API_HOST = 'miflota.qd.je'
const API_IP = '147.93.180.120'

const resolverVps: LookupFunction = (_hostname, options, callback) => {
  // Node pide `all` cuando resuelve varias direcciones: hay que devolver un array.
  if (options.all) callback(null, [{ address: API_IP, family: 4 }])
  else callback(null, API_IP, 4)
}

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
      '/api': {
        target: `https://${API_HOST}`,
        changeOrigin: true,
        secure: true,
        agent: new Agent({ lookup: resolverVps }),
      },
    },
  },
})
