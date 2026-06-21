/**
 * firebaseAdmin — shared, lazy-initialised Firebase Admin SDK instance.
 *
 * Used by:
 *   - routes/auth.js   (verifying phone-OTP ID tokens)
 *   - utils/push.js    (sending FCM push notifications to device tokens)
 *
 * Requires FIREBASE_SERVICE_ACCOUNT (a JSON string) to be set in the
 * environment, or applicationDefault() credentials to be available.
 */
let _firebaseAdmin = null;

function getFirebaseAdmin() {
  if (_firebaseAdmin) return _firebaseAdmin;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;
      admin.initializeApp({
        credential: serviceAccount
          ? admin.credential.cert(serviceAccount)
          : admin.credential.applicationDefault(),
      });
    }
    _firebaseAdmin = admin;
    return admin;
  } catch (e) {
    console.warn('Firebase Admin not initialised:', e.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin };
