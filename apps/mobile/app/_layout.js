import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { ZoneProvider } from '../src/context/ZoneContext';
import { OrderRingerProvider } from '../src/context/OrderRingerContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Global native error handler — catches ALL uncaught JS errors including native module crashes
// This runs BEFORE React's error boundary and catches errors that ErrorBoundary cannot
const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  console.error('GLOBAL ERROR:', error?.message, error?.stack);
  try {
    Alert.alert(
      isFatal ? '⛔ Fatal Error' : '⚠️ Error',
      `${error?.message || 'Unknown error'}\n\nStack: ${(error?.stack || '').slice(0, 300)}`
    );
  } catch (e) {
    // Alert itself failed, nothing we can do
  }
  // Call original handler so React Native can still process the error
  originalHandler?.(error, isFatal);
});

// Global Error Boundary to catch JS errors and show them instead of white screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error?.message || 'An unexpected error occurred'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <ZoneProvider>
              <OrderRingerProvider>
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
              </OrderRingerProvider>
            </ZoneProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
