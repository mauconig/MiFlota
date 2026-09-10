const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function dateTextFromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export function maskDateInput(value: string): string {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateInput(value: string): string | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || year > 9999) return null;
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function validateDateRange(fromText: string, toText: string): { ok: true; from: string; to: string } | { ok: false; error: string } {
  const from = maskDateInput(fromText);
  const to = maskDateInput(toText);
  if (!DATE_PATTERN.test(from)) return { ok: false, error: 'Completá “Desde” con el formato DD/MM/YYYY.' };
  if (!DATE_PATTERN.test(to)) return { ok: false, error: 'Completá “Hasta” con el formato DD/MM/YYYY.' };
  const fromIso = parseDateInput(from);
  if (!fromIso) return { ok: false, error: 'La fecha “Desde” no es válida.' };
  const toIso = parseDateInput(to);
  if (!toIso) return { ok: false, error: 'La fecha “Hasta” no es válida.' };
  if (fromIso > toIso) return { ok: false, error: '“Desde” no puede ser posterior a “Hasta”.' };
  return { ok: true, from: fromIso, to: toIso };
}
