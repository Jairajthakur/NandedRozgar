/**
 * cashfree.native.js  (React Native / Expo — Android & iOS)
 *
 * NOTE (in-app payments fix):
 * This file used to open the SYSTEM BROWSER for checkout (Linking.openURL +
 * deep-link callback). That meant paying kicked the user out of the app.
 *
 * Metro's bundler always prefers a `.native.js` file over the plain `.js`
 * file when resolving imports on Android/iOS. `cashfree.js` already contains
 * a fully-built in-app WebView payment modal (NativePaymentModal) that shows
 * Cashfree checkout right inside the app — it just wasn't being used because
 * this file was shadowing it.
 *
 * Fix: re-export everything from `./cashfree` so native builds use the
 * in-app WebView modal instead of the browser-redirect flow. No screen
 * needs to change — every screen already imports from '../utils/cashfree'.
 */

export { RazorpayModal, useRazorpayCheckout } from './cashfree';
