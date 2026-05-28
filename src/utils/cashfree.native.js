/**
 * cashfree.native.js  (React Native / Expo — Android & iOS)
 *
 * Payment flow (browser-redirect + deep link):
 *   1. POST /api/payments/order  → { payment_session_id, order_id, amount }
 *   2. Linking.openURL(`${APP_URL}/payment/start?session_id=...&order_id=...`)
 *      → system browser auto-POSTs to Cashfree's hosted checkout
 *   3. Cashfree redirects to APP_URL/payment/callback?order_id=...&payment_status=...
 *   4. payment-callback.html redirects to  cityplus://payment/callback?...
 *   5. App.js Linking listener fires → emitPaymentResult(result)
 *   6. Promise in initiatePayment resolves with { success, cashfree_order_id }
 *   7. Caller POSTs /api/payments/verify/* as before
 *
 * No react-native-webview required for the payment flow.
 * API surface (useRazorpayCheckout / RazorpayModal) is IDENTICAL — every
 * screen (PostJobScreen, PostRoomScreen, PostCarScreen, etc.) unchanged.
 */

import { Linking } from 'react-native';
import { onPaymentResult } from './payment_bridge';

// ── Configuration ─────────────────────────────────────────────────────────────

// Must match APP_URL in your Railway env vars.
const APP_URL = 'https://thecityplus.in';

// ── RazorpayModal ─────────────────────────────────────────────────────────────
// Kept as a no-op component so every screen's JSX (`{RazorpayCheckout}`) keeps
// compiling without changes. Nothing is rendered — the browser handles the UI.
export function RazorpayModal() {
  return null;
}

// ── useRazorpayCheckout ───────────────────────────────────────────────────────

export function useRazorpayCheckout({ http: httpFn }) {
  async function initiatePayment({ description, listingType, plan, couponId }) {
    return new Promise(async (resolve) => {
      try {
        // 1. Create the Cashfree order on the server
        const orderRes = await httpFn('POST', '/api/payments/order', {
          description, listingType, plan, couponId,
        });

        if (!orderRes?.ok) {
          return resolve({
            success: false,
            error: orderRes?.error || 'Could not create payment order.',
          });
        }

        // Free plan / fully covered by credits — skip payment entirely
        if (orderRes.free) {
          return resolve({ success: true, free: true });
        }

        if (!orderRes.payment_session_id) {
          return resolve({
            success: false,
            error: 'Payment gateway returned no session. Please contact support.',
          });
        }

        // 2. Register the one-shot deep-link result listener BEFORE opening
        //    the browser, so we never miss a fast callback.
        onPaymentResult((result) => resolve(result));

        // 3. Open the system browser → /payment/start auto-POSTs to Cashfree
        const startUrl =
          `${APP_URL}/payment/start` +
          `?session_id=${encodeURIComponent(orderRes.payment_session_id)}` +
          `&order_id=${encodeURIComponent(orderRes.order_id)}`;

        const canOpen = await Linking.canOpenURL(startUrl);
        if (!canOpen) {
          // Clear the pending listener we just registered
          const { clearPaymentListener } = require('./payment_bridge');
          clearPaymentListener();
          return resolve({
            success: false,
            error: 'Could not open the payment page. Please try again.',
          });
        }

        await Linking.openURL(startUrl);
        // Resolution happens asynchronously via emitPaymentResult in App.js
      } catch (err) {
        const { clearPaymentListener } = require('./payment_bridge');
        clearPaymentListener();
        resolve({ success: false, error: 'Payment initialisation failed.' });
      }
    });
  }

  // RazorpayCheckout is a no-op element — screens render it unchanged
  const RazorpayCheckout = null;

  return { RazorpayCheckout, initiatePayment };
}
