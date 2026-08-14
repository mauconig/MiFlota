import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../auth';
import '../location';
import { configureNotifications, scheduleDailyReminder } from '../notifications';
import { COLORS } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
    scheduleDailyReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bgApp } }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
