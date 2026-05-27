/**
 * animUtils.js  — drop this in src/utils/
 *
 * useNativeDriver must be false on web (Expo web has no native animation module).
 * Use this constant everywhere instead of hardcoding true/false.
 *
 *   import { nativeDriver } from '../utils/animUtils';
 *   Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: nativeDriver });
 */
import { Platform } from 'react-native';
export const nativeDriver = Platform.OS !== 'web';
