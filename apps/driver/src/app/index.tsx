import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth';
import { COLORS } from '../theme';

export default function Index() {
  const { cargando, token } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgApp }}>
        <ActivityIndicator color={COLORS.bgDark} />
      </View>
    );
  }

  return <Redirect href={token ? '/(app)/inicio' : '/login'} />;
}
