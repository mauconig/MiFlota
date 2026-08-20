import type Database from 'better-sqlite3';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushTokenRow {
  token: string;
}

export interface OwnerPushMessage {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
}

/** Envía una notificación al dueño a través de Expo Push Service. */
export async function sendOwnerPush(db: Database.Database, ownerId: number, message: OwnerPushMessage): Promise<number> {
  if (process.env.MIFLOTA_PUSH_ENABLED === 'false') return 0;

  const tokens = db
    .prepare('SELECT token FROM admin_push_tokens WHERE owner_id = ? ORDER BY id')
    .all(ownerId) as PushTokenRow[];
  if (!tokens.length) return 0;

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map(({ token }) => ({
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      })),
    ),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: Array<{ status?: string; details?: { error?: string } }> }
    | null;
  const tickets = payload?.data ?? [];
  const invalid = tokens.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered').map((row) => row.token);
  if (invalid.length) {
    const remove = db.prepare('DELETE FROM admin_push_tokens WHERE token = ?');
    db.transaction(() => invalid.forEach((token) => remove.run(token)))();
  }

  if (!response.ok) throw new Error(`Expo Push respondió ${response.status}`);
  return tokens.length - invalid.length;
}
