import './src/expo-crash-fix';
// Before expo-router/entry so the native and JS crash handlers are installed
// ahead of any application module evaluating - the startup failures this app
// has hit happened during early module evaluation.
import './src/sentry';
import 'react-native-gesture-handler';
import 'expo-router/entry';
