import * as FileSystem from 'expo-file-system/legacy';
import type { AssistantCard, AssistantChart, AssistantFollowUp, AssistantTable } from './api';

/** Un mensaje del chat de MiFlota IA tal como se guarda en disco. */
export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: AssistantCard[];
  chart?: AssistantChart;
  table?: AssistantTable;
  followUps?: AssistantFollowUp[];
  filters?: { label: string; question: string }[];
  asOf?: string;
  notice?: string;
  files?: { name: string; url: string; mimeType: string }[];
  error?: boolean;
  retryQuestion?: string;
}

/** Tope de mensajes guardados: la conversación es útil, pero el archivo no
 *  puede crecer sin límite (los resultados traen tablas y gráficos). */
const MAX_STORED_MESSAGES = 40;

/** Cada usuario tiene su propio archivo para no mezclar conversaciones si se
 *  cambia de cuenta en el mismo teléfono. */
const chatFile = (userKey: string) =>
  `${FileSystem.documentDirectory ?? ''}miflota-ia-${encodeURIComponent(userKey || 'anonimo')}.json`;

function isStoredMessage(value: unknown): value is AssistantChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<AssistantChatMessage>;
  return typeof message.id === 'string'
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.text === 'string';
}

/** Lee la conversación guardada. Ante cualquier problema devuelve una lista
 *  vacía: el chat funciona igual, solo pierde el historial. */
export async function loadAssistantChat(userKey: string): Promise<AssistantChatMessage[]> {
  if (!FileSystem.documentDirectory) return [];
  try {
    const uri = chatFile(userKey);
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return [];
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(uri)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredMessage).slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

/** Guarda la conversación. Si falla, el chat sigue vivo en memoria. */
export async function saveAssistantChat(userKey: string, messages: AssistantChatMessage[]): Promise<void> {
  if (!FileSystem.documentDirectory || !messages.length) return;
  try {
    await FileSystem.writeAsStringAsync(chatFile(userKey), JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // Sin persistencia: la conversación se mantiene mientras la pantalla viva.
  }
}

/** Borra la conversación guardada (botón "Nueva conversación"). */
export async function clearAssistantChat(userKey: string): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  try {
    await FileSystem.deleteAsync(chatFile(userKey), { idempotent: true });
  } catch {
    // Nada que borrar.
  }
}
