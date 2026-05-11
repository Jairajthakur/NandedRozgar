// This is the React Native app entry point.
// The Express server lives in src/index.js and runs separately (e.g. on Railway).
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
