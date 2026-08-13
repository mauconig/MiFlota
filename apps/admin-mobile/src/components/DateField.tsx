import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { isoLocal } from '../format';

const parseIso = (iso: string) => new Date(iso + 'T12:00:00');

/** Reemplazo de `<input type="date">`: no existe en React Native. Muestra el
 *  picker nativo (diálogo en Android, rueda inline en iOS) sobre demanda. */
export function useDateField(value: string, onChange: (iso: string) => void, max?: string) {
  const [open, setOpen] = useState(false);
  const picker = open ? (
    <DateTimePicker
      value={parseIso(value || isoLocal(new Date()))}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      maximumDate={max ? parseIso(max) : undefined}
      onChange={(e, d) => {
        // En Android el diálogo se cierra solo apenas hay una elección (o se
        // cancela); en iOS la rueda queda inline y solo se oculta al tocar
        // "listo" en otro lado — acá se cierra en el próximo `open()`.
        if (Platform.OS === 'android') setOpen(false);
        if (e.type === 'set' && d) onChange(isoLocal(d));
      }}
    />
  ) : null;
  return { open: () => setOpen(true), close: () => setOpen(false), picker };
}
