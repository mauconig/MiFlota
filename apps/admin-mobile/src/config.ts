/** Admin Mobile usa una sola fuente de datos: la API HTTPS de la VPS.
 * La URL vive en `EXPO_PUBLIC_API_URL` (ver `.env.example`); cambiar el dominio
 * requiere compilar un APK nuevo.
 */
export const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL no está configurada (ver .env.example)');
  return url;
})();
