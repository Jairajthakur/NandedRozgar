/**
 * push — sends push notifications via Firebase Cloud Messaging (FCM).
 *
 * WHY FCM AND NOT EXPO'S PUSH API:
 * The app (src/utils/notifications.js) registers devices using
 * Notifications.getDevicePushTokenAsync(), which returns a RAW FCM/APNs
 * device token (not an "ExponentPushToken[...]" token). Expo's push
 * endpoint (https://exp.host/--/api/v2/push/send) only accepts Expo-format
 * tokens — sending raw FCM tokens there silently fails or gets rejected.
 * Since the tokens we store are raw FCM tokens, we must deliver them
 * directly through Firebase Admin's messaging API instead.
 *
 * Usage:
 *   const { sendPushNotifications } = require('../utils/push');
 *   const { sent, failed, invalidTokens } = await sendPushNotifications(
 *     ['<fcm-token-1>', '<fcm-token-2>'],
 *     { title: 'New job', body: 'Tap to view', data: { jobId: '123' } }
 *   );
 */
const { getFirebaseAdmin } = require('./firebaseAdmin');

const FCM_BATCH_MAX = 500; // Firebase's sendEachForMulticast limit per call

/**
 * @param {string[]} tokens - raw FCM device tokens
 * @param {{title:string, body:string, data?:Record<string,any>}} payload
 * @returns {Promise<{sent:number, failed:number, invalidTokens:string[]}>}
 */
async function sendPushNotifications(tokens, { title, body, data = {} } = {}) {
  const admin = getFirebaseAdmin();
  const cleanTokens = [...new Set((tokens || []).filter(Boolean))];

  if (!admin) {
    console.warn('[push] Firebase Admin not configured — set FIREBASE_SERVICE_ACCOUNT');
    return { sent: 0, failed: cleanTokens.length, invalidTokens: [] };
  }
  if (cleanTokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  // FCM "data" payloads must be a flat map of strings.
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  for (let i = 0; i < cleanTokens.length; i += FCM_BATCH_MAX) {
    const batch = cleanTokens.slice(i, i + FCM_BATCH_MAX);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: stringData,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      });

      response.responses.forEach((r, idx) => {
        if (r.success) {
          sent++;
        } else {
          failed++;
          const code = r.error?.code || '';
          // Token is dead/unregistered — caller should clear it from the DB.
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error('[push] FCM batch send failed:', err.message);
      failed += batch.length;
    }
  }

  return { sent, failed, invalidTokens };
}

module.exports = { sendPushNotifications };
