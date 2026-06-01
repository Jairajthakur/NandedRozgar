/**
 * useAppUpdate.js — CityPlus
 *
 * Checks the Play Store for a newer version and prompts the user to update.
 *
 * HOW IT WORKS:
 *   1. On app launch (and every 24 h), fetches the latest versionCode from
 *      your backend at GET /api/app/version.
 *   2. Compares it against the current build's versionCode (from app.config.js).
 *   3. If a newer version exists → shows an in-app modal asking user to update.
 *      - FLEXIBLE update  → user can dismiss and continue using the app.
 *      - IMMEDIATE update → user cannot dismiss; must update to continue.
 *
 * SETUP (3 steps):
 *   1. Add GET /api/app/version to your backend (see backend snippet below).
 *   2. Wrap your root component with <UpdateProvider> (see App.js snippet).
 *   3. Bump ANDROID_VERSION_CODE in eas.json before every Play Store build.
 *
 * BACKEND SNIPPET (add to server/index.js or a new route):
 * ─────────────────────────────────────────────────────────
 *   app.get('/api/app/version', (req, res) => {
 *     res.json({
 *       ok: true,
 *       android: {
 *         versionCode:  46,          // ← bump this every release
 *         versionName:  '4.6.0',
 *         forceUpdate:  false,       // true = user CANNOT skip
 *         updateMessage: 'A new version of CityPlus is available with bug fixes and new features.',
 *       },
 *     });
 *   });
 * ─────────────────────────────────────────────────────────
 *
 * APP.JS SNIPPET:
 * ─────────────────────────────────────────────────────────
 *   import { UpdateProvider } from './src/hooks/useAppUpdate';
 *
 *   export default function App() {
 *     return (
 *       <UpdateProvider>
 *         <AuthProvider>
 *           ...rest of your app...
 *         </AuthProvider>
 *       </UpdateProvider>
 *     );
 *   }
 * ─────────────────────────────────────────────────────────
 */

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Linking, Platform, Animated, Easing,
} from 'react-native';
import Constants from 'expo-constants';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE        = process.env.EXPO_PUBLIC_API_URL || 'https://thecityplus.in';
const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.cityplus.app';
const CHECK_INTERVAL  = 24 * 60 * 60 * 1000; // 24 hours
const IS_ANDROID      = Platform.OS === 'android';

// ── Context ───────────────────────────────────────────────────────────────────
const UpdateContext = createContext(null);

export function useAppUpdate() {
  return useContext(UpdateContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function UpdateProvider({ children }) {
  const [updateInfo,  setUpdateInfo]  = useState(null); // { versionName, forceUpdate, message }
  const [showModal,   setShowModal]   = useState(false);
  const lastChecked = useRef(0);

  const checkForUpdate = useCallback(async () => {
    // Only on Android — iOS uses its own mechanism
    if (!IS_ANDROID) return;

    // Throttle: don't check more than once every CHECK_INTERVAL
    if (Date.now() - lastChecked.current < CHECK_INTERVAL) return;
    lastChecked.current = Date.now();

    try {
      const res = await fetch(`${API_BASE}/api/app/version`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !data.android) return;

      const { versionCode, versionName, forceUpdate = false, updateMessage } = data.android;

      // Get current build's versionCode from Expo Constants
      const currentVersionCode = Constants.expoConfig?.android?.versionCode
        || Constants.manifest?.android?.versionCode
        || Constants.manifest2?.extra?.expoClient?.android?.versionCode
        || 0;

      if (versionCode > currentVersionCode) {
        setUpdateInfo({
          versionName,
          forceUpdate,
          message: updateMessage || `CityPlus ${versionName} is available with improvements and bug fixes.`,
        });
        setShowModal(true);
      }
    } catch (e) {
      // Silent fail — never crash the app over an update check
      console.warn('[UpdateCheck] failed:', e.message);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    // Small delay so app fully loads before showing modal
    const timer = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  function handleUpdate() {
    Linking.openURL(PLAY_STORE_URL).catch(() => {});
  }

  function handleDismiss() {
    if (updateInfo?.forceUpdate) return; // can't dismiss forced updates
    setShowModal(false);
  }

  return (
    <UpdateContext.Provider value={{ checkForUpdate }}>
      {children}
      <UpdateModal
        visible={showModal}
        info={updateInfo}
        onUpdate={handleUpdate}
        onDismiss={handleDismiss}
      />
    </UpdateContext.Provider>
  );
}

// ── Modal UI ──────────────────────────────────────────────────────────────────
function UpdateModal({ visible, info, onUpdate, onDismiss }) {
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, damping: 14, stiffness: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!info) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => { if (!info.forceUpdate) onDismiss(); }}
    >
      <View style={s.overlay}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>

          {/* Icon */}
          <View style={s.iconWrap}>
            <Text style={s.iconEmoji}>🚀</Text>
          </View>

          {/* Title */}
          <Text style={s.title}>Update Available</Text>
          <Text style={s.version}>CityPlus {info.versionName}</Text>

          {/* Message */}
          <Text style={s.message}>{info.message}</Text>

          {/* Force update notice */}
          {info.forceUpdate && (
            <View style={s.forceBadge}>
              <Text style={s.forceText}>⚠️ This update is required to continue using the app</Text>
            </View>
          )}

          {/* Buttons */}
          <TouchableOpacity style={s.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
            <Text style={s.updateBtnText}>Update Now →</Text>
          </TouchableOpacity>

          {!info.forceUpdate && (
            <TouchableOpacity style={s.laterBtn} onPress={onDismiss} activeOpacity={0.75}>
              <Text style={s.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ORANGE = '#f97316';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  iconEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  version: {
    fontSize: 13,
    fontWeight: '700',
    color: ORANGE,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  forceBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#fcd34d',
    width: '100%',
  },
  forceText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  updateBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 10,
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  laterBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  laterBtnText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
});
