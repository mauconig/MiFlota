import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { askAssistant, SinSesion, type AssistantAction, type AssistantCard, type AssistantHistoryItem, type AssistantTable } from '../api';
import { API_BASE } from '../config';
import { Pagination } from '../components/Pagination';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: AssistantCard[];
  table?: AssistantTable;
  filters?: { label: string; question: string }[];
  asOf?: string;
  notice?: string;
  files?: { name: string; url: string; mimeType: string }[];
  error?: boolean;
  retryQuestion?: string;
}

const INTRO: ChatMessage = {
  id: 'intro',
  role: 'assistant',
  text: 'Preguntame por deudas, cobros, gastos o rendimiento. Consulto los datos reales de tu flota cada vez que me escribís.',
};

const SUGGESTIONS = ['¿Quién debe más?', '¿Qué auto rinde más este mes?', '¿Cuánto cobré esta semana?', '¿En qué gasté más este mes?'];

function dateLabel(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function ResultCard({ card, onAction }: { card: AssistantCard; onAction: (action: AssistantAction) => void }) {
  const content = (
    <View style={styles.resultCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {card.title}
        </Text>
        {!!card.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={2}>
            {card.subtitle}
          </Text>
        )}
      </View>
      <Text style={styles.resultValue}>{card.value}</Text>
    </View>
  );
  return card.action ? (
    <Pressable onPress={() => onAction(card.action!)} accessibilityRole="button" accessibilityLabel={card.action.label}>
      {content}
    </Pressable>
  ) : content;
}

function ResultTable({ table, onAction }: { table: AssistantTable; onAction: (action: AssistantAction) => void }) {
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const resetKey = useMemo(() => table.rows.map((row) => row.id).join('|'), [table.rows]);
  const pageCount = Math.max(1, Math.ceil(table.rows.length / PAGE_SIZE));
  const visibleRows = table.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {table.columns.map((column) => <Text key={column.key} style={[styles.tableCell, styles.tableHeader]}>{column.label}</Text>)}
          </View>
          {visibleRows.map((row) => {
            const content = (
              <View style={styles.tableRow}>
                {table.columns.map((column) => <Text key={column.key} style={styles.tableCell} numberOfLines={2}>{row.cells[column.key] || '—'}</Text>)}
              </View>
            );
            return row.action ? (
              <Pressable key={row.id} onPress={() => onAction(row.action!)} accessibilityRole="button" accessibilityLabel={row.action.label}>
                {content}
              </Pressable>
            ) : <View key={row.id}>{content}</View>;
          })}
        </View>
      </ScrollView>
      <Pagination page={page} pageSize={PAGE_SIZE} total={table.rows.length} itemLabel="filas" onPageChange={setPage} />
    </View>
  );
}

export function Assistant({ onSinSesion, onOpenCar }: { onSinSesion: () => void; onOpenCar: (carId: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const nextId = useRef(1);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || sending) return;

    Keyboard.dismiss();
    const userMessage: ChatMessage = { id: `m${nextId.current++}`, role: 'user', text: question };
    const history: AssistantHistoryItem[] = messages
      .filter((message) => message.id !== INTRO.id && !message.error)
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.text }));
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setSending(true);

    try {
      const reply = await askAssistant(question, history);
      setMessages((current) => [
        ...current,
        {
          id: `m${nextId.current++}`,
          role: 'assistant',
          text: reply.answer,
          cards: reply.cards,
          table: reply.table,
          filters: reply.filters,
          asOf: reply.asOf,
          notice: reply.notice,
          files: reply.files,
        },
      ]);
    } catch (error) {
      if (error instanceof SinSesion) {
        onSinSesion();
        return;
      }
      const detail = error instanceof Error ? error.message : 'Error inesperado';
      setMessages((current) => [
        ...current,
        {
          id: `m${nextId.current++}`,
          role: 'assistant',
          text: `No pude consultar la flota: ${detail}`,
          error: true,
          retryQuestion: question,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const activateAction = (action: AssistantAction) => {
    if (action.kind === 'car') onOpenCar(action.carId);
    else void send(action.question);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.messageWrap, mine && styles.messageWrapMine]}>
        {!mine && <Text style={styles.sender}>MIFLOTA IA</Text>}
        <View style={[styles.bubble, mine ? styles.userBubble : styles.assistantBubble, item.error && styles.errorBubble]}>
          <Text style={[styles.messageText, mine && styles.userText]}>{item.text}</Text>
        </View>
        {!!item.cards?.length && (
          <View style={styles.cards}>
            {item.cards.map((card, index) => (
              <ResultCard key={`${card.kind}-${card.title}-${index}`} card={card} onAction={activateAction} />
            ))}
          </View>
        )}
        {!!item.table?.rows.length && <ResultTable table={item.table} onAction={activateAction} />}
        {!!item.filters?.length && (
          <View style={styles.filters}>
            {item.filters.map((filter) => (
              <Pressable key={`${item.id}-${filter.label}`} onPress={() => void send(filter.question)} disabled={sending} style={styles.filter} accessibilityRole="button">
                <Text style={styles.filterText}>{filter.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!!item.notice && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{item.notice}</Text>
          </View>
        )}
        {!!item.files?.length && <View style={styles.files}>{item.files.map((file) => <Pressable key={file.url} onPress={() => void Linking.openURL(API_BASE.replace(/\/+$/, '') + file.url)} style={styles.fileButton} accessibilityRole="button"><Text style={styles.fileButtonText}>Abrir {file.name}</Text></Pressable>)}</View>}
        {!!item.asOf && <Text style={styles.asOf}>Datos actualizados al {dateLabel(item.asOf)}</Text>}
        {!!item.retryQuestion && (
          <Pressable onPress={() => void send(item.retryQuestion!)} disabled={sending} accessibilityRole="button" style={styles.retryButton}>
            <Text style={styles.retryText}>Volver a intentar</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <View style={{ gap: 12 }}>
            {messages.length === 1 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionLabel}>PROBÁ PREGUNTANDO</Text>
                <View style={styles.suggestionGrid}>
                  {SUGGESTIONS.map((suggestion) => (
                    <Pressable key={suggestion} onPress={() => void send(suggestion)} disabled={sending} style={styles.suggestion}>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {sending && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator color="#8a5d16" size="small" />
                <Text style={styles.loadingText}>Consultando la flota…</Text>
              </View>
            )}
          </View>
        }
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Preguntá sobre tu flota"
          placeholderTextColor="#8b857b"
          multiline
          maxLength={600}
          editable={!sending}
          style={styles.input}
          accessibilityLabel="Pregunta para el asistente"
        />
        <Pressable
          onPress={() => void send(draft)}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Enviar pregunta"
          style={({ pressed }) => [styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled, pressed && styles.sendPressed]}
        >
          <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#16150f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m22 2-7 20-4-9-9-4Z" />
            <Path d="M22 2 11 13" />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 },
  suggestions: { gap: 9, marginBottom: 4 },
  suggestionLabel: { paddingLeft: 3, fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#6b665c' },
  suggestionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { maxWidth: '100%', borderWidth: 1, borderColor: '#e4d7c3', backgroundColor: '#fff8e9', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  suggestionText: { color: '#6e4a13', fontSize: 12, fontWeight: '600' },
  messageWrap: { alignSelf: 'stretch', alignItems: 'flex-start', gap: 5 },
  messageWrapMine: { alignItems: 'flex-end' },
  sender: { marginLeft: 3, color: '#8a5d16', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  bubble: { maxWidth: '88%', borderRadius: 19, paddingHorizontal: 14, paddingVertical: 11 },
  assistantBubble: { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderTopLeftRadius: 6 },
  userBubble: { backgroundColor: '#16150f', borderTopRightRadius: 6 },
  errorBubble: { backgroundColor: '#fff2ee', borderColor: '#efc8bc' },
  messageText: { color: '#2a2823', fontSize: 14, lineHeight: 20 },
  userText: { color: '#fffaf0' },
  cards: { alignSelf: 'stretch', gap: 7, marginTop: 2 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 15, borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', paddingHorizontal: 13, paddingVertical: 10 },
  resultTitle: { color: '#2a2823', fontSize: 12, fontWeight: '700' },
  resultSubtitle: { color: '#756f65', fontSize: 10, marginTop: 2 },
  resultValue: { color: '#256b4d', fontSize: 13, fontWeight: '800' },
  tableScroll: { alignSelf: 'stretch', marginTop: 3 },
  table: { minWidth: '100%', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, overflow: 'hidden', backgroundColor: '#fffdf8' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee7dc', paddingHorizontal: 10, paddingVertical: 9 },
  tableCell: { minWidth: 104, flex: 1, color: '#3b3831', fontSize: 10, lineHeight: 14, paddingRight: 8 },
  tableHeader: { color: '#7e5a1e', fontWeight: '800', fontSize: 9 },
  filters: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  filter: { borderWidth: 1, borderColor: '#e4d7c3', backgroundColor: '#fff8e9', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { color: '#6e4a13', fontSize: 10, fontWeight: '700' },
  notice: { maxWidth: '92%', borderRadius: 12, backgroundColor: '#fdf0dd', paddingHorizontal: 10, paddingVertical: 7 },
  noticeText: { color: '#835c18', fontSize: 10, lineHeight: 14 },
  files: { alignSelf: 'stretch', gap: 7, marginTop: 2 },
  fileButton: { borderRadius: 14, backgroundColor: '#e7f2ec', borderWidth: 1, borderColor: '#cfe4d7', paddingHorizontal: 12, paddingVertical: 10 },
  fileButtonText: { color: '#256b4d', fontSize: 12, fontWeight: '800' },
  asOf: { color: '#817b71', fontSize: 9, marginLeft: 3 },
  retryButton: { borderRadius: 14, borderWidth: 1, borderColor: '#d7aa99', paddingHorizontal: 12, paddingVertical: 7 },
  retryText: { color: '#914531', fontSize: 11, fontWeight: '700' },
  loadingBubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 18, borderTopLeftRadius: 6, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', paddingHorizontal: 14, paddingVertical: 11 },
  loadingText: { color: '#6b665c', fontSize: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, backgroundColor: '#fffdf8', borderTopWidth: 1, borderTopColor: '#e6ded0', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  input: { flex: 1, maxHeight: 112, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ddd4c5', backgroundColor: '#f8f4ec', color: '#1a1a18', fontSize: 14, lineHeight: 19, paddingHorizontal: 15, paddingVertical: 11 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8a13a', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { transform: [{ scale: 0.96 }] },
});
