import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { OfflineProvider } from '@/context/OfflineContext';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { NotificationBanner } from '@/features/notifications/components/NotificationBanner';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { notification } = usePushNotifications();
  const [fontsLoaded] = useFonts({
    // Add your custom fonts here if needed
    // Example: 'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Or a loading component
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NotificationBanner
          title={notification?.request.content.title ?? ''}
          body={notification?.request.content.body ?? ''}
        />
        <AuthProvider>
          <OfflineProvider>
            <CurrencyProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: '#fff' },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="index" />
              </Stack>
            </CurrencyProvider>
          </OfflineProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
