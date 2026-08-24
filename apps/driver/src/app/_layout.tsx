import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../auth';
import { configureNotifications, scheduleDailyReminder } from '../notifications';
import { COLORS } from '../theme';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
    scheduleDailyReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bgApp } }} />
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
