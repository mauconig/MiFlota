import { Pressable, Text, View } from 'react-native';

interface RegistrarWizardProps {
  step: number;
  totalSteps: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}

export function RegistrarWizard({
  step,
  totalSteps,
  title,
  hint,
  children,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  nextDisabled = false,
  showBack = true,
}: RegistrarWizardProps) {
  const progress = Math.min(1, Math.max(0, (step + 1) / Math.max(1, totalSteps)));
  return (
    <View style={{ gap: 14, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text allowFontScaling={false} style={{ color: '#6b665c', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }}>
            PASO {step + 1} DE {totalSteps}
          </Text>
          <Text allowFontScaling={false} style={{ color: '#9b9386', fontSize: 11 }}>Registro guiado</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: '#e8e0d3', overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, backgroundColor: '#e8a13a' }} />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#16150f', fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
        {!!hint && <Text allowFontScaling={false} style={{ color: '#6b665c', fontSize: 14, lineHeight: 19 }}>{hint}</Text>}
      </View>

      <View style={{ gap: 14 }}>{children}</View>

      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
        {showBack && (
          <Pressable onPress={onBack} style={{ minHeight: 52, flex: 1, borderRadius: 18, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
            <Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 15, fontWeight: '700' }}>Atrás</Text>
          </Pressable>
        )}
        <Pressable onPress={onNext} disabled={nextDisabled} style={{ minHeight: 52, flex: 1, borderRadius: 18, backgroundColor: nextDisabled ? '#e2dbcc' : '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: nextDisabled ? '#8d8578' : '#fffdf8', fontSize: 15, fontWeight: '700' }}>{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
