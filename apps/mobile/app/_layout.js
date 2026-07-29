import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ══════════════════════════════════════════════════════════════════════
// CRASH-SAFE NATIVE MODULE IMPORTS
// Every native module is wrapped in try-catch with a fallback.
// If ANY native module fails to load, the app still renders.
// ══════════════════════════════════════════════════════════════════════

// IMMEDIATE SPLASH SCREEN DISMISSAL — runs at module load time
// This is the FIRST LINE OF DEFENSE against white screen deadlocks.
// If the JS bundle loads at all, this fires before any component mounts.
try {
  const _SplashScreen = require('expo-splash-screen');
  _SplashScreen.hideAsync().catch(() => {});
} catch (_e) {
  // expo-splash-screen not available — no-op
}

// GestureHandlerRootView — fallback to plain View
let GestureHandlerRootView;
try {
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
} catch (e) {
  console.warn('[_layout] react-native-gesture-handler not available, using View fallback:', e.message);
  GestureHandlerRootView = View;
}

// SafeAreaProvider — fallback to plain View
let SafeAreaProvider;
try {
  SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
} catch (e) {
  console.warn('[_layout] react-native-safe-area-context not available, using View fallback:', e.message);
  SafeAreaProvider = ({ children }) => <View style={{ flex: 1 }}>{children}</View>;
}

// SplashScreen — optional
let SplashScreen;
try {
  SplashScreen = require('expo-splash-screen');
} catch (e) {
  console.warn('[_layout] expo-splash-screen not available:', e.message);
  SplashScreen = { hideAsync: () => Promise.resolve(), preventAutoHideAsync: () => Promise.resolve() };
}

// ══════════════════════════════════════════════════════════════════════
// CRASH-SAFE PROVIDER IMPORTS
// Each provider is wrapped in try-catch.
// If a provider fails to import, we use a passthrough wrapper.
// ══════════════════════════════════════════════════════════════════════
const PassthroughProvider = ({ children }) => <>{children}</>;

let AuthProvider = PassthroughProvider;
try { AuthProvider = require('../src/context/AuthContext').AuthProvider; } catch (e) { console.warn('[_layout] AuthProvider import failed:', e.message); }

let ZoneProvider = PassthroughProvider;
try { ZoneProvider = require('../src/context/ZoneContext').ZoneProvider; } catch (e) { console.warn('[_layout] ZoneProvider import failed:', e.message); }

let OrderRingerProvider = PassthroughProvider;
try { OrderRingerProvider = require('../src/context/OrderRingerContext').OrderRingerProvider; } catch (e) { console.warn('[_layout] OrderRingerProvider import failed:', e.message); }

let NotificationProvider = PassthroughProvider;
try { NotificationProvider = require('../src/context/NotificationContext').NotificationProvider; } catch (e) { console.warn('[_layout] NotificationProvider import failed:', e.message); }

let LanguageProvider = PassthroughProvider;
try { LanguageProvider = require('../src/context/LanguageContext').LanguageProvider; } catch (e) { console.warn('[_layout] LanguageProvider import failed:', e.message); }

let QueryClientProvider = PassthroughProvider;
let queryClient = null;
try {
  QueryClientProvider = require('@tanstack/react-query').QueryClientProvider;
  queryClient = require('../src/lib/queryClient').queryClient;
} catch (e) {
  console.warn('[_layout] React Query import failed:', e.message);
}

// OfflineQueueService — optional
let OfflineQueueService = null;
try { OfflineQueueService = require('../src/services/OfflineQueueService').OfflineQueueService; } catch (e) { console.warn('[_layout] OfflineQueueService import failed:', e.message); }

// ══════════════════════════════════════════════════════════════════════
// DO NOT CALL SplashScreen.preventAutoHideAsync()!
// This was the ROOT CAUSE of the splash screen freeze.
// If ANY import above crashes, preventAutoHideAsync locks the splash
// screen forever because hideAsync() never gets called.
// ══════════════════════════════════════════════════════════════════════

// Global native error handler
const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  console.error('GLOBAL ERROR:', error?.message, error?.stack);
  try {
    Alert.alert(
      isFatal ? '⛔ Fatal Error' : '⚠️ Error',
      `${error?.message || 'Unknown error'}\n\nStack: ${(error?.stack || '').slice(0, 300)}`
    );
  } catch (e) { /* Alert itself failed */ }
  originalHandler?.(error, isFatal);
});

// Error Boundary
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
    // Force-hide native splash screen immediately on mount using multiple methods
    const dismissSplash = async () => {
      try {
        if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn('SplashScreen.hideAsync error (ignored):', e.message);
      }
    };
    dismissSplash();

    // Secondary safety timer to hide splash screen if initial call didn't clear it
    const timer = setTimeout(() => {
      dismissSplash();
    }, 300);

    // Initialize offline queue (optional)
    try {
      if (OfflineQueueService) OfflineQueueService.init();
    } catch (err) {
      console.warn('OfflineQueueService.init() failed (non-fatal):', err.message);
    }

    // Setup notifications — fire-and-forget, never blocks app rendering
    const setupNotifications = async () => {
      try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
        await Notifications.requestPermissionsAsync();
      } catch (error) {
        console.warn('Notifications setup skipped:', error.message);
      }
    };
    setupNotifications();

    return () => clearTimeout(timer);
  }, []);

  // Build the provider tree, wrapping QueryClientProvider specially
  const QueryWrapper = queryClient
    ? ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    : PassthroughProvider;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryWrapper>
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
          </QueryWrapper>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
