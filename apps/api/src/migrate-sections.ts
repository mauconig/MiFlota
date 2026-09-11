import { openDb } from './db.js';

const db = openDb();
const owner = db.prepare("SELECT id FROM users WHERE lower(usuario)='admin'").get() as { id: number } | undefined;
if (!owner) throw new Error('No existe el usuario admin');

const cars = db.prepare('SELECT id,plate,model FROM cars WHERE owner_id=? ORDER BY rowid').all(owner.id) as { id: string; plate: string; model: string }[];
const cleanPlate = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const target = (car: typeof cars[number]) => {
  if (['KAV515', 'XBL008'].includes(cleanPlate(car.plate))) return 'Autos viejos';
  const brand = car.model.trim().split(/\s+/)[0].toLocaleLowerCase('es');
  return brand === 'hyundai' ? 'Hyundai' : brand === 'kia' ? 'Kia' : brand === 'toyota' ? 'Toyota' : brand === 'chevrolet' ? 'Chevrolet' : null;
};
const unmatched = cars.filter((car) => !target(car));
if (unmatched.length) {
  console.error(JSON.stringify({ error: 'Autos sin regla de sección; no se modificó nada', unmatched }, null, 2));
  process.exitCode = 2;
} else {
  const summary = db.transaction(() => {
    const names = ['Hyundai', 'Kia', 'Toyota', 'Chevrolet', 'Autos viejos'];
    const ids = new Map<string, number>();
    for (const [position, name] of names.entries()) {
      db.prepare('INSERT OR IGNORE INTO sections(owner_id,name,position) VALUES (?,?,?)').run(owner.id, name, position);
      db.prepare('UPDATE sections SET position=? WHERE owner_id=? AND lower(trim(name))=lower(?)').run(position, owner.id, name);
      const row = db.prepare('SELECT id FROM sections WHERE owner_id=? AND lower(trim(name))=lower(?)').get(owner.id, name) as { id: number };
      ids.set(name, row.id);
    }
    for (const car of cars) db.prepare('UPDATE cars SET section_id=? WHERE id=? AND owner_id=?').run(ids.get(target(car)!)!, car.id, owner.id);
    return names.map((name) => ({ name, cars: (db.prepare('SELECT COUNT(*) count FROM cars WHERE owner_id=? AND section_id=?').get(owner.id, ids.get(name)) as { count: number }).count }));
  })();
  const demoSummary = db.transaction(() => {
    const owners = db.prepare("SELECT id,usuario FROM users WHERE lower(usuario) IN ('test','demo')").all() as { id: number; usuario: string }[];
    return owners.map((testOwner) => {
      const testCars = db.prepare('SELECT id,model FROM cars WHERE owner_id=?').all(testOwner.id) as { id: string; model: string }[];
      const brands = [...new Set(testCars.map((car) => car.model.trim().split(/\s+/)[0]))];
      const ids = new Map<string, number>();
      for (const [position, brand] of brands.entries()) {
        db.prepare('INSERT OR IGNORE INTO sections(owner_id,name,position) VALUES (?,?,?)').run(testOwner.id, brand, position);
        const row = db.prepare('SELECT id FROM sections WHERE owner_id=? AND lower(trim(name))=lower(trim(?))').get(testOwner.id, brand) as { id: number };
        ids.set(brand, row.id);
      }
      for (const car of testCars) db.prepare('UPDATE cars SET section_id=? WHERE id=? AND owner_id=?').run(ids.get(car.model.trim().split(/\s+/)[0])!, car.id, testOwner.id);
      return { owner: testOwner.usuario, sections: brands.map((brand) => ({ name: brand, cars: (db.prepare('SELECT COUNT(*) count FROM cars WHERE owner_id=? AND section_id=?').get(testOwner.id, ids.get(brand)) as { count: number }).count })) };
    });
  })();
  console.log(JSON.stringify({ ok: true, ownerId: owner.id, sections: summary, test: demoSummary }, null, 2));
}
db.close();
