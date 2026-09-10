import { Text, TextInput, View } from 'react-native';
import { maskDateInput } from '../dateRange';

const PAPER = '#fffdf8';
const BORDER = '#e6ded0';
const INK = '#16150f';
const MUTED = '#6b665c';

export function DateRangeInputs({ fromText, toText, error, onFromChange, onToChange }: {
  fromText: string;
  toText: string;
  error?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const inputStyle = {
    minHeight: 50,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: PAPER,
    paddingHorizontal: 12,
    color: INK,
    fontSize: 14,
  } as const;

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }}>Desde</Text>
          <TextInput
            value={fromText}
            onChangeText={(value) => onFromChange(maskDateInput(value))}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#a39b8e"
            keyboardType="number-pad"
            maxLength={10}
            style={inputStyle}
            accessibilityLabel="Fecha desde"
          />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }}>Hasta</Text>
          <TextInput
            value={toText}
            onChangeText={(value) => onToChange(maskDateInput(value))}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#a39b8e"
            keyboardType="number-pad"
            maxLength={10}
            style={inputStyle}
            accessibilityLabel="Fecha hasta"
          />
        </View>
      </View>
      {!!error && <Text style={{ color: '#b34732', backgroundColor: '#fbe9e5', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 17 }}>{error}</Text>}
    </View>
  );
}

