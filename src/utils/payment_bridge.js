/**
 * payment_bridge.js
 *
 * A tiny singleton event bridge that lets App.js (which owns the Linking
 * deep-link listener) communicate a payment result back to the Promise that
 * is awaiting in cashfree.js.
 *
 * Usage:
 *   // In cashfree.js — register a one-shot listener before opening browser:
 *   import { onPaymentResult } from './payment_bridge';
 *   onPaymentResult(result => resolve(result));
 *
 *   // In App.js — fire when the deep link arrives:
 *   import { emitPaymentResult } from './payment_bridge';
 *   emitPaymentResult({ success: true, cashfree_order_id: '...' });
 */

let _pendingCallback = null;

/**
 * Register a one-shot callback.  Only one listener is active at a time;
 * calling this again before emitting replaces the previous listener.
 *
 * @param {(result: object) => void} cb
 */
export function onPaymentResult(cb) {
  _pendingCallback = cb;
}

/**
 * Deliver a result to the waiting callback (if any) and clear it.
 *
 * @param {{ success: boolean, cashfree_order_id?: string, error?: string, cancelled?: boolean }} result
 */
export function emitPaymentResult(result) {
  if (_pendingCallback) {
    const cb = _pendingCallback;
    _pendingCallback = null;
    cb(result);
  }
}

/**
 * Cancel any pending listener without delivering a result.
 * Call this if you need to clean up on unmount.
 */
export function clearPaymentListener() {
  _pendingCallback = null;
}
