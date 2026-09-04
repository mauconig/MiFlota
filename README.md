# MiFlota

La referencia funcional vigente está en [docs/current.md](docs/current.md).
Ahí se describen el balance acumulado, GPS, historial de ubicaciones, mapas y
comprobantes autenticados.

Sistema de gestión de flota para dueños, administradores y choferes. Permite
controlar vehículos, cuotas, cobros, gastos, comprobantes, kilometraje,
alertas de mantenimiento y reportes de fallas.

El proyecto está organizado como un monorepo con un backend compartido y tres
clientes:

| Proyecto | Tecnología | Uso |
| --- | --- | --- |
| `apps/api` | Fastify + SQLite | API, autenticación, reglas de negocio y archivos |
| `apps/admin-web` | React + TypeScript + Vite | Panel web del dueño |
| `apps/admin-mobile` | Expo + React Native | Panel móvil del dueño |
| `apps/driver` | Expo + React Native | App móvil del chofer |

La base oficial de producción vive en la VPS. Los comprobantes se almacenan en
Cloudinary cuando las credenciales del servidor están configuradas.

## Requisitos

- Node.js 22 o compatible con las versiones de los `package.json`.
- npm.
- Para Android: JDK 17+, Android SDK, `adb` y un emulador o dispositivo.
- Para generar development builds: Android SDK configurado y las carpetas
  nativas de cada app (`android/`).

La configuración reproducible del emulador Windows, sin Android Studio, está
en [docs/android-emulator-setup.md](docs/android-emulator-setup.md).

## Instalación

Desde la raíz del repositorio:

```powershell
npm install
npm --prefix apps/api install
npm --prefix apps/admin-mobile install
npm --prefix apps/driver install
```

El workspace de npm incluye actualmente sólo `apps/admin-web`. API y las dos
apps móviles mantienen sus propios `node_modules` y lockfiles por sus
dependencias nativas y sus versiones específicas de React Native.

## Variables de entorno

Copiar `.env.example` a `.env` y completar, como mínimo, las credenciales del
primer administrador:

```powershell
Copy-Item .env.example .env
```

Variables del servidor:

- `MIFLOTA_ADMIN_USER`, `MIFLOTA_ADMIN_PASSWORD` y `MIFLOTA_ADMIN_NOMBRE`:
  sólo se usan al crear el primer usuario de una base vacía.
- `MIFLOTA_TIME_ZONE`: por defecto `America/Asuncion`.
- `MIFLOTA_PUSH_ENABLED`: permite activar o desactivar los pushes del backend.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y
  `CLOUDINARY_FOLDER`: almacenamiento de comprobantes.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` y `OPENROUTER_BASE_URL`: asistente
  de admin-mobile. La clave nunca debe usar el prefijo `EXPO_PUBLIC_`.

No guardar contraseñas, tokens ni claves de Cloudinary o OpenRouter en Git.
Las claves de servicios externos deben vivir únicamente en la API.

### URL de la API en las apps

`apps/driver/.env` usa `EXPO_PUBLIC_API_URL`:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

`10.0.2.2` es el alias del host desde un emulador Android. En un teléfono
físico se debe usar la IP LAN de la computadora, por ejemplo
`http://192.168.100.34:3000`, y permitir los puertos en Windows Firewall si
corresponde.

Admin web y admin mobile están configurados para usar la API oficial de la
VPS durante el desarrollo normal. El proxy de admin web está en
`apps/admin-web/vite.config.ts` y admin mobile tiene su URL en
`apps/admin-mobile/src/config.ts`. Cambiar esos destinos sólo cuando se quiera
probar deliberadamente contra una base local.

## Desarrollo local

### 1. Levantar la API con una base local

En PowerShell, desde la raíz, preparar una base separada de producción:

```powershell
New-Item -ItemType Directory -Force apps/api/.localdata | Out-Null
$env:MIFLOTA_DB = (Join-Path (Resolve-Path apps/api/.localdata) 'miflota.db')
npm --prefix apps/api run build
npm --prefix apps/api start
```

La API queda en `http://localhost:3000`. Verificarla con:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

El comando `npm --prefix apps/api run dev` sólo recompila TypeScript en modo
watch; no inicia el proceso HTTP. Si se usa, hay que dejar la API arrancada en
otra terminal con `npm --prefix apps/api start`.

Para cargar datos de demostración en la base local, conservar el mismo valor
de `$env:MIFLOTA_DB` y ejecutar en otra terminal:

```powershell
npm --prefix apps/api run provision:demo -- --json
```

No ejecutar este comando contra la URL o la base de producción sin confirmar
antes el objetivo.

### 2. Admin web

```powershell
npm run dev:admin-web
```

Abrir [http://localhost:5173](http://localhost:5173). El puerto es fijo para
que pueda convivir con Metro. El panel requiere una API accesible y una sesión
válida.

### 3. Development client de Chofer

Chofer no se prueba con Expo Go. Primero instalar o recompilar el development
build nativo si cambió la configuración nativa:

```powershell
Push-Location apps/driver/android
./gradlew.bat assembleDebug --no-daemon
Pop-Location
adb install -r apps/driver/android/app/build/outputs/apk/debug/app-debug.apk
```

Luego iniciar Metro en el puerto 8081:

```powershell
npm --prefix apps/driver run dev -- --dev-client --port 8081 --lan
```

Abrir el enlace LAN desde el development client instalado. En el emulador,
la API local sigue siendo `http://10.0.2.2:3000`; en un teléfono físico se usa
la IP LAN.

### 4. Development client de Admin

Admin mobile también es un development client, no Expo Go. Para levantarlo al
mismo tiempo que Chofer, usar otro puerto de Metro:

```powershell
Push-Location apps/admin-mobile/android
./gradlew.bat assembleDebug --no-daemon
Pop-Location
adb install -r apps/admin-mobile/android/app/build/outputs/apk/debug/app-debug.apk

npm --prefix apps/admin-mobile run dev -- --dev-client --port 8082 --lan
```

Se puede usar el emulador `MiFlota` definido en la guía de Android. Confirmar
que esté conectado antes de abrir las apps:

```powershell
adb devices
```

Los dos servidores Metro pueden ejecutarse simultáneamente porque usan los
puertos 8081 y 8082.

## Funcionalidades principales

- Cuotas y pagos del chofer, incluyendo pagos parciales y la opción exacta
  �STodo lo atrasado⬝.
- Carga y visualización de comprobantes mediante Cloudinary.
- Reportes de fallas desde Chofer vinculados con Alertas de Admin.
- Reportes urgentes con prioridad alta y filtros por chapa, chofer, categoría
  y texto.
- Flujo de reporte �SEnviar a taller⬝, con un único gasto y actualización
  transaccional del vehículo y del reporte.
- Resolución de reportes sin cambiar automáticamente el estado del vehículo.
- Alertas y pushes de pagos, reportes, cuotas y kilometraje.
- Resumen diario de alertas según `MIFLOTA_TIME_ZONE`.

## Verificación

Ejecutar los checks desde la raíz:

```powershell
npm run build:api
npm run build:admin-web
Push-Location apps/admin-mobile
npx tsc --noEmit
Pop-Location
Push-Location apps/driver
npx tsc --noEmit
Pop-Location
```

Para una comprobación rápida del entorno en ejecución:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-WebRequest http://localhost:5173
Test-NetConnection localhost -Port 8081
Test-NetConnection localhost -Port 8082
```

Antes de validar cambios de pagos, reportes o comprobantes, confirmar que la
app apunta a la API esperada y que no se está usando accidentalmente la base
local en lugar de la VPS.

## Producción

La imagen Docker compila admin web y la API. SQLite se conserva en el volumen
`miflota-data`, fuera de la capa de imagen:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f miflota
```

El contenedor escucha internamente en el puerto 3000 y publica sólo
`127.0.0.1:8791` en el host. El acceso público debe pasar por el reverse proxy
HTTPS configurado en la VPS.

Verificación del servicio:

```powershell
Invoke-RestMethod https://miflota.147-93-180-120.sslip.io/api/health
```

No reconstruir ni eliminar el volumen de datos como parte de un despliegue.
Antes de una operación de mantenimiento, realizar y comprobar un backup de
`miflota.db`.

## Estructura útil

```text
apps/
  api/             Fastify, SQLite, autenticación, Cloudinary y pushes
  admin-web/       panel React/Vite
  admin-mobile/    panel React Native/Expo del dueño
  driver/          app React Native/Expo del chofer
docs/
  android-emulator-setup.md
  auth.md
  push-notifications.md
  plan.md
```

La documentación histórica de auditorías y decisiones está en `docs/`. Los
datos locales generados por desarrollo deben quedar dentro de
`apps/api/.localdata` y no deben usarse como base de producción.

## Solución de problemas

### �SFailed to connect⬝ desde una app móvil

1. Confirmar que la API responde en `/api/health`.
2. Confirmar `adb devices` y que el emulador esté completamente iniciado.
3. En emulador usar `10.0.2.2`, no `localhost`.
4. En teléfono físico usar la IP LAN y revisar Windows Firewall.
5. Reiniciar Metro con `-c` si quedó un bundle o una variable vieja en caché.

### La app abre Expo Go o muestra un SDK incompatible

Abrir el development build instalado de la app correspondiente. Chofer y
Admin mobile usan `expo-dev-client`; Expo Go no reemplaza esos binarios cuando
se requieren módulos nativos o configuración propia.

### Un puerto está ocupado

Usar API en 3000, admin web en 5173, Chofer en Metro 8081 y Admin en Metro
8082. Revisar el proceso que ocupa el puerto antes de cambiar la configuración,
porque los enlaces y development builds pueden depender de esos valores.
