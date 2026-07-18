import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { ZoneProvider } from '../src/context/ZoneContext';
import { OrderRingerProvider } from '../src/context/OrderRingerContext';
import { CartProvider } from '../src/context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// REMOVED: expo-task-manager import — unused and causes native module crash on startup
// REMOVED: expo-location import — unused here (handled in ZoneContext)
// MOVED: Notifications import to inside the effect to prevent module-scope crashes

export default function RootLayout() {
  useEffect(() => {
    // Request permission for push notifications — wrapped in dynamic import
    // to prevent native module crashes if expo-notifications isn't properly linked
    const setupNotifications = async () => {
      try {
        const Notifications = require('expo-notifications');
        
        // Configure push notification display behavior
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Push notification permissions denied');
        }
      } catch (error) {
        // If expo-notifications native module is missing or misconfigured,
        // gracefully degrade instead of crashing the entire app
        console.warn('Notifications setup skipped (native module unavailable):', error.message);
      }
    };
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ZoneProvider>
            <OrderRingerProvider>
              <CartProvider>
                <NotificationProvider>
                  <LanguageProvider>
                    <StatusBar style="auto" />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="register" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="forgot-password" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="modules" options={{ headerShown: false }} />
                      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                      <Stack.Screen name="search" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding-tutorial" options={{ headerShown: false }} />
                    </Stack>
                  </LanguageProvider>
                </NotificationProvider>
              </CartProvider>
            </OrderRingerProvider>
          </ZoneProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
