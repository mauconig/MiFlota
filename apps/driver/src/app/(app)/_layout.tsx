import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../auth';
import { BottomNav, type NavKey } from '../../components/BottomNav';
import { COLORS } from '../../theme';

export default function AppLayout() {
  const { cargando, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (cargando) return null;
  if (!token) return <Redirect href="/login" />;

  const active: NavKey = pathname.includes('/pagos')
    ? 'pagos'
    : pathname.includes('/reportes') || pathname.includes('/nueva-queja')
      ? 'reportes'
      : pathname.includes('/perfil')
        ? 'perfil'
        : 'inicio';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bgApp } }} />
      </View>
      <BottomNav
        active={active}
        onNav={(k) => router.navigate(`/(app)/${k}` as never)}
        onPagar={() => router.push('/(app)/pagar' as never)}
      />
    </View>
  );
}
