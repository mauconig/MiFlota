import { useEffect, useRef, useState } from 'react';
import './AssistantChat.css';

export interface ChatReply {
  answer: string;
  asOf: string;
  notice?: string;
  cards?: { title: string; value: string; subtitle?: string }[];
  chart?: { kind: 'bars' | 'line'; title: string; items: { label: string; value: number; displayValue: string }[] };
  table?: { columns: { key: string; label: string }[]; rows: { id: string; cells: Record<string, string>; action?: { kind: string; carId?: string; label: string } }[] };
  followUps?: { label: string; question: string }[];
  files?: { name: string; url: string }[];
}
export interface ChatHistory { role: 'user' | 'assistant'; content: string }
interface Exchange { question: string; reply?: ChatReply; error?: string }
interface Props { ask: (question: string, history: ChatHistory[], signal: AbortSignal) => Promise<ChatReply>; onOpenCar: (id: string) => void }

function AssistantResultTable({ table, onOpenCar, initiallyOpen = true }: { table: NonNullable<ChatReply['table']>; onOpenCar: (id: string) => void; initiallyOpen?: boolean }) {
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 }>({ key: table.columns[0]?.key || '', direction: 1 });
  const rows = [...table.rows].sort((a, b) => {
    const av = a.cells[sort.key] ?? '';
    const bv = b.cells[sort.key] ?? '';
    return av.localeCompare(bv, 'es', { numeric: true, sensitivity: 'base' }) * sort.direction;
  });
  const pick = (key: string) => setSort(current => current.key === key ? { key, direction: current.direction === 1 ? -1 : 1 } : { key, direction: 1 });
  return <details className="ai-table" open={initiallyOpen}>
    <summary>Ver datos ({table.rows.length})</summary>
    <div tabIndex={0} role="region" aria-label="Tabla de resultados"><table><thead><tr>{table.columns.map(c => <th key={c.key}><button className="ai-sort-button" type="button" onClick={() => pick(c.key)} aria-label={'Ordenar por ' + c.label} aria-sort={sort.key === c.key ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>{c.label} <span aria-hidden="true">{sort.key === c.key ? (sort.direction === 1 ? '↑' : '↓') : '↕'}</span></button></th>)}<th><span className="ai-sr-only">Acción</span></th></tr></thead><tbody>{rows.map(r => <tr key={r.id}>{table.columns.map(c => <td key={c.key}>{r.cells[c.key] ?? '—'}</td>)}<td>{r.action?.kind === 'car' && r.action.carId && <button onClick={() => onOpenCar(r.action!.carId!)}>Ver vehículo</button>}</td></tr>)}</tbody></table></div>
  </details>;
}

function Chart({ chart }: { chart: NonNullable<ChatReply['chart']> }) {
  const items = chart.items.filter(i => Number.isFinite(i.value));
  if (items.length < 2) return null;
  const min = Math.min(0, ...items.map(i => i.value));
  const max = Math.max(0, ...items.map(i => i.value));
  const span = max - min || 1;
  const x = (i: number) => 24 + i * 280 / (items.length - 1);
  const y = (v: number) => 136 - (v - min) / span * 112;
  return <figure className="ai-chart">
    <figcaption>{chart.title}</figcaption>
    {chart.kind === 'line' ? <>
      <svg viewBox="0 0 328 168" role="img" aria-label={chart.title}>
        <line x1="24" x2="304" y1={y(0)} y2={y(0)} stroke="#c7bdac" />
        <polyline fill="none" stroke="#2e7d5b" strokeWidth="2.5" points={items.map((i,n) => `${x(n)},${y(i.value)}`).join(' ')} />
        {items.map((i,n) => <circle key={n} cx={x(n)} cy={y(i.value)} r="3" fill="#2e7d5b"><title>{i.label}: {i.displayValue}</title></circle>)}
        <text x="24" y="160" fontSize="10" fill="#6b665c">{items[0].label}</text>
        <text x="304" y="160" textAnchor="end" fontSize="10" fill="#6b665c">{items.at(-1)!.label}</text>
      </svg>
      <details><summary>Ver valores del gráfico</summary>{items.map((i,n) => <div className="ai-chart-label" key={n}><span>{i.label}</span><strong>{i.displayValue}</strong></div>)}</details>
    </> : items.map((i,n) => <div className="ai-bar" key={n}>
      <div className="ai-chart-label"><span>{i.label}</span><strong>{i.displayValue}</strong></div>
      <div className="ai-bar-track"><span className="ai-bar-zero" style={{ left: `${-min / span * 100}%` }} /><span className="ai-bar-fill" style={{ left: `${(Math.min(0,i.value) - min) / span * 100}%`, width: `${Math.abs(i.value) / span * 100}%`, background: i.value < 0 ? '#b94e3c' : '#2e7d5b' }} /></div>
    </div>)}
  </figure>;
}

export function AssistantChat({ ask, onOpenCar }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [launcherVisible, setLauncherVisible] = useState(true);
  const busyRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const lastScrollTop = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: 'nearest' }); }, [open, exchanges, busy]);
  useEffect(() => {
    const scrollContainer = launcher.current?.closest('main');
    if (!scrollContainer) return;
    lastScrollTop.current = scrollContainer.scrollTop;
    const onScroll = () => {
      const current = scrollContainer.scrollTop;
      const delta = current - lastScrollTop.current;
      if (Math.abs(delta) < 2) return;
      lastScrollTop.current = current;
      setLauncherVisible(current <= 8 || delta < 0);
    };
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, []);
  const close = () => { setOpen(false); requestAnimationFrame(() => { if (launcherVisible) launcher.current?.focus(); }); };
  const submit = async (question: string, retry = false) => {
    question = question.trim();
    if (!question || question.length > 600 || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setDraft('');
    const previous = retry ? exchanges.slice(0,-1) : exchanges;
    const history = previous.filter(e => e.reply).flatMap(e => [{ role: 'user' as const, content: e.question }, { role: 'assistant' as const, content: e.reply!.answer }]);
    setExchanges([...previous, { question }]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const reply = await ask(question, history, abort.signal);
      if (!abort.signal.aborted) setExchanges([...previous, { question, reply }]);
    } catch (error) {
      if (!abort.signal.aborted) setExchanges([...previous, { question, error: error instanceof Error ? error.message : 'No se pudo responder. Volvé a intentar.' }]);
    } finally {
      if (!abort.signal.aborted) { busyRef.current = false; setBusy(false); }
    }
  };
  return <>
    <button ref={launcher} className={'ai-launcher' + (launcherVisible ? '' : ' ai-launcher-hidden')} onClick={() => setOpen(v => !v)} aria-label={open ? 'Minimizar asistente MiFlota' : 'Abrir asistente MiFlota'} aria-expanded={open} aria-controls="miflota-chat">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-4 3 1.5-6A8 8 0 1 1 20 11.5Z" /><path d="M7 11h8M7 7h5" /></svg>
      <span>MiFlota IA</span>{busy && <span className="ai-dot" />}
    </button>
    {open && <section id="miflota-chat" className="ai-panel" role="dialog" aria-modal="false" aria-labelledby="ai-title" onKeyDown={e => { if(e.key === 'Escape') { e.stopPropagation(); close(); } }}>
      <header className="ai-header"><div><h2 id="ai-title">Tu flota, en una conversación</h2><span>Asistente MiFlota</span></div><button aria-label="Nueva conversación" title="Nueva conversación" disabled={busy} onClick={() => { setExchanges([]); setDraft(''); input.current?.focus(); }}>＋</button><button onClick={close} aria-label="Minimizar chat" title="Minimizar">−</button></header>
      <div className="ai-messages" role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions text">
        {!exchanges.length && <div className="ai-welcome"><span className="ai-eyebrow">¿QUÉ QUERÉS SABER?</span><h3>Consultá los datos de tu flota</h3><p>Autos, choferes, cobros y gastos. Te ayudo a encontrar respuestas y comparar resultados.</p><div className="ai-suggestions">{['¿Quién maneja BYJ 066?', 'Mostrame los autos por modelo', '¿Cuánto cobramos este mes?'].map(q => <button key={q} onClick={() => void submit(q)}>{q}<span aria-hidden="true">↗</span></button>)}</div></div>}
        {exchanges.map((exchange,index) => <div className="ai-exchange" key={index}>
          <div className="ai-question"><span className="ai-sr-only">Vos: </span>{exchange.question}</div>
          {exchange.reply && <article className="ai-answer"><span className="ai-eyebrow">MIFLOTA IA</span><p>{exchange.reply.answer}</p>
            {exchange.reply.notice && <p className="ai-notice">{exchange.reply.notice}</p>}
            {!!exchange.reply.cards?.length && <div className="ai-metrics">{exchange.reply.cards.map((c,n) => <div key={n}><span>{c.title}</span><strong>{c.value}</strong>{c.subtitle && <small>{c.subtitle}</small>}</div>)}</div>}
            {exchange.reply.chart && <Chart chart={exchange.reply.chart} />}
            {exchange.reply.table && <AssistantResultTable table={exchange.reply.table} initiallyOpen={!exchange.reply.chart} onOpenCar={id => { close(); onOpenCar(id); }} />}
            {exchange.reply.files?.filter(f => f.url.startsWith('/api/assistant/files/')).map(f => <a key={f.url} href={f.url} target="_blank" rel="noreferrer">{f.name}</a>)}
            <small className="ai-date">Datos al {exchange.reply.asOf}</small>
            {index === exchanges.length - 1 && !!exchange.reply.followUps?.length && <div className="ai-followups">{exchange.reply.followUps.map(f => <button key={f.question} disabled={busy} onClick={() => void submit(f.question)}>{f.label}</button>)}</div>}
          </article>}
          {exchange.error && <div className="ai-error" role="alert"><p>{exchange.error}</p>{index === exchanges.length-1 && <button disabled={busy} onClick={() => void submit(exchange.question, true)}>Reintentar</button>}</div>}
        </div>)}
        {busy && <div className="ai-loading" role="status"><span className="ai-dot" /> Consultando tu flota…</div>}
        <div ref={bottom} />
      </div>
      <form className="ai-composer" onSubmit={e => { e.preventDefault(); void submit(draft); }}><label className="ai-sr-only" htmlFor="ai-question">Tu pregunta</label><textarea ref={input} id="ai-question" placeholder="Preguntá sobre tu flota…" value={draft} maxLength={600} rows={2} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(draft); } }} /><button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar pregunta">↑</button><small>Enter para enviar · Shift+Enter para otra línea</small></form>
    </section>}
  </>;
}
