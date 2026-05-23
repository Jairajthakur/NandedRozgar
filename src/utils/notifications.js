import { Platform } from 'react-native';
import { BASE_URL } from './constants';

// expo-notifications is not supported on web — guard everything
let Notifications = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Notifications) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f97316',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Persist the Expo push token to the authenticated user's DB record.
 * Call this once after login/register, passing the JWT and the token
 * returned by registerForPushNotifications().
 *
 * @param {string} authToken  - JWT from login/register response
 * @param {string} pushToken  - Expo push token (token.data)
 */
export async function savePushTokenToServer(authToken, pushToken) {
  if (!authToken || !pushToken) return;
  try {
    await fetch(`${BASE_URL}/api/auth/save-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });
  } catch (err) {
    console.warn('Failed to save push token:', err.message);
  }
}

export function addNotificationResponseListener(callback) {
  if (Platform.OS === 'web' || !Notifications) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}
