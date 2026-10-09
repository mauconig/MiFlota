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

// Para probar contra una API local (p. ej. `MIFLOTA_API_TARGET=http://127.0.0.1:3999`)
// sin tocar el default: si la variable está puesta, se usa tal cual (http normal,
// sin el resolver de la VPS). Sin la variable, todo sigue igual que antes.
const API_TARGET = process.env.MIFLOTA_API_TARGET || `https://${API_HOST}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cache aparte cuando se prueba contra una API local: así no compite con la
  // instancia que apunta a la VPS por el mismo `node_modules/.vite`.
  ...(process.env.MIFLOTA_API_TARGET ? { cacheDir: 'node_modules/.vite-local' } : {}),
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
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        ...(process.env.MIFLOTA_API_TARGET ? {} : { agent: new Agent({ lookup: resolverVps }) }),
      },
    },
  },
})
