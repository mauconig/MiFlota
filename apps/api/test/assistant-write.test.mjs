import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temp = mkdtempSync(join(tmpdir(), 'miflota-write-'));
process.env.MIFLOTA_DB = join(temp, 'test.db');
const { openDb } = await import('../dist/db.js');
const { proposeExpenseDraft, applyExpenseDraft } = await import('../dist/assistantWrite.js');
const { answerAssistant } = await import('../dist/assistant.js');
const db = openDb();
after(() => { db.close(); rmSync(temp, { recursive: true, force: true }); });
db.exec(`
 INSERT INTO cars(id,owner_id,plate,model,year,driver,estado) VALUES
 ('a',1,'A 416','Hyundai Gran i10 blanco',2020,'Sin chofer','activo'),
 ('b',1,'BYJ 066','Kia Picanto',2018,'Sin chofer','activo'),
 ('private',2,'SECRET','Private Car',2020,'Otro','activo');
`);
const today = '2026-09-08';

test('propose builds a validated draft without writing', () => {
  const before = db.prepare('SELECT COUNT(*) n FROM movs').get().n;
  const draft = proposeExpenseDraft(db, 1, {
    vehicle: 'A416',
    category: 'taller',
    items: [
      { description: 'Caño de aire acondicionado', amount: 250000 },
      { description: 'Filtro cabina aire acondicionado', amount: 70000 },
      { description: 'Mano de obra', amount: 150000 },
    ],
  }, today);
  assert.equal(draft.vehicle.carId, 'a');
  assert.equal(draft.vehicle.plate, 'A 416');
  assert.equal(draft.category, 'Taller');
  assert.equal(draft.date, today);
  assert.equal(draft.items.length, 3);
  assert.equal(draft.total, 470000);
  assert.equal(draft.displayTotal, 'Gs. 470.000');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM movs').get().n, before);
});

test('propose rejects unknown vehicle, category and bad amounts', () => {
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'NOPE', category: 'Taller', items: [{ description: 'x', amount: 1 }] }, today), /No encontré ningún vehículo/);
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'A416', category: 'Comida', items: [{ description: 'x', amount: 1 }] }, today), /categoría válida/);
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'A416', category: 'Taller', items: [{ description: '', amount: 1 }] }, today), /descripción/);
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'A416', category: 'Taller', items: [{ description: 'x', amount: 0 }] }, today), /no es válido/);
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'A416', category: 'Taller', items: [] }, today), /ninguna línea/);
  assert.throws(() => proposeExpenseDraft(db, 1, { vehicle: 'SECRET', category: 'Taller', items: [{ description: 'x', amount: 1 }] }, today), /No encontré ningún vehículo/);
});

test('apply writes owner-scoped expenses atomically', () => {
  const result = applyExpenseDraft(db, 1, { items: [
    { carId: 'a', description: 'Caño de aire acondicionado', amount: 250000, category: 'Taller' },
    { carId: 'a', description: 'Cubierta usada', amount: 120000, category: 'taller' },
  ] }, today);
  assert.equal(result.created, 2);
  assert.equal(result.total, 370000);
  const rows = db.prepare("SELECT * FROM movs WHERE owner_id=1 AND car_id='a' AND type='egreso' ORDER BY id").all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].cat, 'Taller');
  assert.equal(rows[0].date, today);
  assert.equal(rows[1].amount, 120000);
  // Un carId de otro dueño no se puede grabar y no deja nada a medias.
  const before = db.prepare('SELECT COUNT(*) n FROM movs').get().n;
  assert.throws(() => applyExpenseDraft(db, 1, { items: [
    { carId: 'a', description: 'ok', amount: 1000, category: 'Taller' },
    { carId: 'private', description: 'ajeno', amount: 1000, category: 'Taller' },
  ] }, today), /no es tuyo/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM movs').get().n, before);
});

test('agent proposes an expense load and returns the draft', async () => {
  const calls = [];
  const fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    const toolResult = JSON.parse(init.body).messages.findLast((m) => m.role === 'tool');
    const message = toolResult
      ? { role: 'assistant', content: JSON.stringify({ answer: 'Preparé la carga.', draftId: 0, followUps: [] }) }
      : { role: 'assistant', content: null, tool_calls: [{ id: 'p', type: 'function', function: { name: 'propose_expenses', arguments: JSON.stringify({ vehicle: 'A416', category: 'Taller', items: [{ description: 'Cubierta usada', amount: 120000 }] }) } }] };
    return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
  };
  const reply = await answerAssistant('Ahora vamos a hacer cargas de gastos para el admin', [], today, {
    apiKey: 'test',
    fetch,
    queryFleet: async () => { throw Error('no debería consultar'); },
    proposeExpenses: async (args) => proposeExpenseDraft(db, 1, args, today),
  });
  assert.equal(calls[0].tool_choice.function.name, 'propose_expenses');
  assert.equal(reply.drafts.length, 1);
  assert.equal(reply.drafts[0].items[0].amount, 120000);
  assert.match(reply.answer, /Preparé la carga/);
});
