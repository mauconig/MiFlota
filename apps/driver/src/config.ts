export const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL no está configurada (ver .env.example)');
  return url;
})();
