import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { BottomSheet } from './BottomSheet';

interface Option {
  id: string;
  label: string;
}

/** Reemplazo de `<select>`: no existe en React Native. Abre una BottomSheet
 *  con las opciones en vez de un dropdown nativo, reusando el mismo patrón
 *  visual que EstadoSheet/ChoferSheet. */
export function useSelectSheet(title: string, options: Option[], onChange: (id: string) => void) {
  const [open, setOpen] = useState(false);
  const sheet = open ? (
    <BottomSheet title={title} onClose={() => setOpen(false)}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => {
            onChange(o.id);
            setOpen(false);
          }}
          style={{ borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a18' }}>{o.label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  ) : null;
  return { open: () => setOpen(true), sheet };
}
