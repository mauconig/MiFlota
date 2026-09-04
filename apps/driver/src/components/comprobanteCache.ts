import { useCallback, useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export interface CachedComprobanteSource {
  uri: string;
  name: string;
  type: string;
  headers?: Record<string, string>;
}

const pending = new Map<string, Promise<string>>();

function extension(source: CachedComprobanteSource): string {
  return source.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || (source.type === 'application/pdf' ? 'pdf' : 'jpg');
}

export async function materializeComprobante(source: CachedComprobanteSource): Promise<string> {
  if (!/^https?:\/\//i.test(source.uri)) return source.uri;
  const cached = pending.get(source.uri);
  if (cached) return cached;
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('No se pudo preparar el comprobante');
  const key = encodeURIComponent(source.uri).replace(/%/g, '').slice(-120);
  const target = `${directory}miflota-comprobante-${key}.${extension(source)}`;
  const job = FileSystem.getInfoAsync(target)
    .then(async (info) => {
      if (info.exists) return target;
      const result = await FileSystem.downloadAsync(source.uri, target, { headers: source.headers });
      if (result.status < 200 || result.status >= 300) {
        await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
        throw new Error(`comprobante ${result.status}`);
      }
      return result.uri;
    })
    .catch((error) => {
      pending.delete(source.uri);
      throw error;
    });
  pending.set(source.uri, job);
  return job;
}

export function useComprobanteUri(source: CachedComprobanteSource | null, enabled: boolean) {
  const [uri, setUri] = useState<string | null>(source && !/^https?:\/\//i.test(source.uri) ? source.uri : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!source || !enabled) {
      setUri(source && !/^https?:\/\//i.test(source.uri) ? source.uri : null);
      setLoading(false);
      setError(false);
      return () => { alive = false; };
    }
    setLoading(true);
    setError(false);
    void materializeComprobante(source).then((local) => {
      if (alive) setUri(local);
    }).catch(() => {
      if (alive) { setUri(null); setError(true); }
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [source?.uri, source?.type, enabled, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { uri, loading, error, retry };
}
