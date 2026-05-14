// ── Push Notifications Utility ────────────────────────────────────────────────
// Handles registration, permission request, and local notification scheduling.
// Uses expo-notifications (install: expo install expo-notifications)

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { http } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register this device for push notifications.
 * Sends the push token to your backend so the server can send targeted pushes.
 * Call this once after the user logs in.
 */
export async function registerForPushNotifications() {
  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'da8f053f-5fd8-4bff-9004-7c4ecba82ff8', // from app.json extra.eas.projectId
    });
    const token = tokenData.data;

    // Send token to backend
    await http('POST', '/api/auth/push-token', { pushToken: token });

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'NandedRozgar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f97316',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('jobs', {
        name: 'New Jobs',
        description: 'Alerts when new jobs match your profile',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#f97316',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('activity', {
        name: 'Listing Activity',
        description: 'Views and applications on your listings',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return token;
  } catch (e) {
    console.warn('Push registration error:', e.message);
    return null;
  }
}

/**
 * Schedule a local notification immediately (for in-app triggers).
 * e.g. "Someone viewed your listing"
 */
export async function scheduleLocalNotification({ title, body, data = {}, channelId = 'default' }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // null = fire immediately
    });
  } catch (e) {
    console.warn('scheduleLocalNotification error:', e.message);
  }
}

/**
 * Add a notification response listener (handles tap on notification).
 * Returns an unsubscribe function — call it on unmount.
 */
export function addNotificationResponseListener(handler) {
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}

/**
 * Add a foreground notification listener.
 * Returns an unsubscribe function — call it on unmount.
 */
export function addNotificationListener(handler) {
  const sub = Notifications.addNotificationReceivedListener(handler);
  return () => sub.remove();
}

/**
 * Clear all delivered notifications (badge reset).
 */
export async function clearAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (e) {
    console.warn('clearAllNotifications error:', e.message);
  }
}
