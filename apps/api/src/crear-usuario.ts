/**
 * Alta y cambio de contraseña de usuarios del panel.
 *
 *   node dist/crear-usuario.js <usuario> [--nombre "Nombre Apellido"]
 *                              [--password <clave>] [--reset]
 *                              [--seed] [--adoptar]
 *
 * Sin --password genera una contraseña fuerte y la imprime una única vez: no
 * queda guardada en ningún lado más que en la base, y ahí solo su hash.
 *
 *   --reset    cambia la contraseña de un usuario que ya existe
 *   --seed     le carga la flota de demostración (si no, arranca vacío)
 *   --adoptar  le asigna la flota que quedó sin dueño al migrar la base
 */
import { randomInt } from 'node:crypto';
import { hashPassword, migrarAuth, registrarAuth } from './auth.js';
import { adoptarHuerfanos, openDb, sembrarFlota } from './db.js';

// Sin caracteres que se confundan al leerlos en voz alta o al copiarlos a mano:
// 0/O, 1/l/I, 5/S, 8/B.
const ALFABETO = 'abcdefghijkmnopqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789';

function generarPassword(largo = 24): string {
  let out = '';
  for (let i = 0; i < largo; i++) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf('--' + nombre);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (n: string) => process.argv.includes('--' + n);

const usuario = process.argv[2];
if (!usuario || usuario.startsWith('--')) {
  console.error('Uso: node dist/crear-usuario.js <usuario> [--nombre "X"] [--password <clave>] [--reset]');
  process.exit(2);
}

const db = openDb();
migrarAuth(db);

const existente = db.prepare('SELECT id, usuario FROM users WHERE usuario = ?').get(usuario) as { id: number; usuario: string } | undefined;
const reset = flag('reset');

if (existente && !reset) {
  console.error(`El usuario "${existente.usuario}" ya existe. Usá --reset para cambiarle la contraseña.`);
  process.exit(1);
}
if (!existente && reset) {
  console.error(`No existe el usuario "${usuario}".`);
  process.exit(1);
}

const password = arg('password') ?? generarPassword();
const generada = !arg('password');
if (password.length < 12) {
  console.error('La contraseña debe tener al menos 12 caracteres.');
  process.exit(1);
}

const rol = arg('rol') ?? 'owner';
const estado = arg('estado') ?? 'activo';
if (!['owner', 'admin'].includes(rol)) {
  console.error('El rol debe ser "owner" o "admin".');
  process.exit(1);
}
if (!['activo', 'deshabilitado'].includes(estado)) {
  console.error('El estado debe ser "activo" o "deshabilitado".');
  process.exit(1);
}

const hash = await hashPassword(password);

let userId: number;

if (existente) {
  userId = existente.id;
  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(hash, userId);
  // Cambiar la contraseña invalida lo que haya quedado abierto en otro lado.
  const { changes } = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  registrarAuth(db, 'password_reset', usuario, { detalle: `sesiones cerradas: ${changes}` });
  console.log(`Contraseña actualizada para "${usuario}". Sesiones cerradas: ${changes}.`);
} else {
  const r = db.prepare('INSERT INTO users (usuario, nombre, pass_hash, creado, rol, estado) VALUES (?, ?, ?, ?, ?, ?)').run(
    usuario,
    arg('nombre') || usuario,
    hash,
    new Date().toISOString(),
    rol,
    estado,
  );
  userId = Number(r.lastInsertRowid);
  registrarAuth(db, 'usuario_creado', usuario, { detalle: `rol=${rol} estado=${estado}` });
  console.log(`Usuario "${usuario}" creado${flag('seed') ? '' : ' con la flota vacía'}.`);
}

if (flag('adoptar')) {
  const n = adoptarHuerfanos(db, userId);
  console.log(`Vehículos sin dueño reasignados a "${usuario}": ${n}.`);
}

if (flag('seed')) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM cars WHERE owner_id = ?').get(userId) as { n: number };
  if (n > 0) {
    console.log(`"${usuario}" ya tiene ${n} vehículos: no se siembra encima.`);
  } else {
    const s = sembrarFlota(db, userId);
    console.log(`Flota de demostración cargada para "${usuario}": ${s.cars} vehículos, ${s.movs} movimientos.`);
  }
}

if (generada) {
  console.log('');
  console.log('  contraseña: ' + password);
  console.log('');
  console.log('  Se muestra una sola vez. En la base queda solo el hash.');
}

db.close();
