// This is the React Native app entry point.
// The Express server lives in src/index.js and runs separately (e.g. on Railway).
import { registerRootComponent } from 'expo';
import { Alert } from 'react-native';
import App from './App';

// Global error handler — shows crash reason on screen instead of silent crash
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (isFatal) {
    Alert.alert(
      'App Crash - Please Screenshot',
      `${error.name}: ${error.message}\n\n${error.stack?.slice(0, 500)}`,
      [{ text: 'OK' }]
    );
  }
  console.error(error);
});

registerRootComponent(App);
