import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const dir = mkdtempSync(join(tmpdir(), 'miflota-sections-'));
process.env.MIFLOTA_DB = join(dir, 'test.db');
const { openDb, sembrarFlota } = await import('../dist/db.js');
const db = openDb();

try {
  const ownerId = 99;
  const result = sembrarFlota(db, ownerId);
  assert.equal(result.cars, 15);
  const sections = db.prepare('SELECT name, COUNT(c.id) count FROM sections s LEFT JOIN cars c ON c.section_id=s.id GROUP BY s.id ORDER BY s.position').all();
  assert.deepEqual(sections.map((s) => s.name), ['Toyota', 'Kia', 'Hyundai', 'Chevrolet', 'Honda', 'Nissan']);
  assert.equal(sections.reduce((n, s) => n + s.count, 0), 15);

  const ids = db.prepare('SELECT id FROM sections WHERE owner_id=? ORDER BY position').all(ownerId).map((s) => s.id);
  db.prepare('UPDATE cars SET section_id=NULL WHERE owner_id=? AND section_id=?').run(ownerId, ids[0]);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM cars WHERE owner_id=? AND section_id IS NULL').get(ownerId).count, 6);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM sections WHERE owner_id=?').get(ownerId).count, 6);
} finally {
  db.close();
  rmSync(dir, { recursive: true, force: true });
}
