/**
 * razorpay.native.js
 *
 * Used automatically by Metro on iOS and Android.
 * Uses react-native-webview to show the Razorpay checkout sheet inside
 * a Modal. WebView is NOT available on web — that is handled by razorpay.js.
 *
 * Install:  npx expo install react-native-webview
 */

import React, { useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { RAZORPAY_KEY_ID } from './constants';
import { http } from './api';

// ── Sanitise a value so it is safe to embed inside a JS string literal ─────────
function escapeForJS(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/'/g,  "\\'")
    .replace(/</g,  '\\u003C')
    .replace(/>/g,  '\\u003E')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// ── HTML page injected into the WebView ───────────────────────────────────────
// FIX 1: Replaced window.onload with checkout.js's own onload callback via a
//         dynamically created <script> tag. This guarantees rzp.open() is only
//         called AFTER checkout.js has fully executed — window.onload can fire
//         before external scripts finish in some WebView implementations.
// FIX 2: Added key validation — posts FAILED immediately if key is empty so the
//         app shows a clear error instead of a generic Razorpay crash screen.
// FIX 3: Wrapped rzp initialisation in try/catch so any SDK error is caught and
//         reported back to React Native rather than silently crashing the WebView.
function buildCheckoutHTML({ orderId, amount, currency, description, userName, userEmail, userPhone, keyId }) {
  const cfg = JSON.stringify({
    key:         escapeForJS(keyId),
    amount:      String(amount),
    currency:    escapeForJS(currency || 'INR'),
    name:        'NandedRozgar',
    description: escapeForJS(description || 'Listing Payment'),
    order_id:    escapeForJS(orderId),
    prefill: {
      name:    escapeForJS(userName),
      email:   escapeForJS(userEmail),
      contact: escapeForJS(userPhone),
    },
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Payment</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; background:#f5f5f5; display:flex;
           flex-direction:column; align-items:center;
           justify-content:center; height:100vh; font-family:sans-serif; }
    #loader { color:#888; font-size:14px; text-align:center; padding:20px; }
    #error-box { display:none; color:#dc2626; font-size:13px;
                 text-align:center; padding:24px; max-width:300px; }
  </style>
</head>
<body>
  <div id="loader">Opening payment gateway…</div>
  <div id="error-box"></div>

  <script type="application/json" id="rzp-cfg">${cfg}</script>

  <script>
    // Helper: send message back to React Native
    function rn(msg) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch(e) {}
    }

    function showError(msg) {
      document.getElementById('loader').style.display = 'none';
      var box = document.getElementById('error-box');
      box.textContent = msg;
      box.style.display = 'block';
    }

    function initRazorpay() {
      try {
        var opts = JSON.parse(document.getElementById('rzp-cfg').textContent);

        // FIX 2: Validate key before opening — empty key causes SDK crash
        if (!opts.key || opts.key.trim() === '') {
          showError('Payment configuration error. Please contact support.');
          rn({ type: 'FAILED', error: 'Razorpay key is not configured. Set EXPO_PUBLIC_RAZORPAY_KEY_ID in EAS secrets.' });
          return;
        }

        var options = {
          key:         opts.key,
          amount:      opts.amount,
          currency:    opts.currency,
          name:        opts.name,
          description: opts.description,
          order_id:    opts.order_id,
          prefill:     opts.prefill,
          theme:       { color: '#f97316' },
          modal: {
            ondismiss: function() {
              rn({ type: 'CANCELLED' });
            }
          },
          handler: function(response) {
            rn({
              type:                 'SUCCESS',
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
          }
        };

        // FIX 3: Wrap in try/catch to capture SDK init errors
        var rzp;
        try {
          rzp = new Razorpay(options);
        } catch(e) {
          showError('Failed to initialise payment gateway.');
          rn({ type: 'FAILED', error: e.message || 'Razorpay init failed' });
          return;
        }

        rzp.on('payment.failed', function(response) {
          rn({
            type:  'FAILED',
            error: (response.error && response.error.description) || 'Payment failed',
          });
        });

        document.getElementById('loader').style.display = 'none';
        rzp.open();

      } catch(e) {
        showError('Unexpected error. Please try again.');
        rn({ type: 'FAILED', error: e.message || 'Unknown error' });
      }
    }

    // FIX 1: Load checkout.js dynamically and call initRazorpay only in its
    // onload — this guarantees the Razorpay SDK is fully ready before we call
    // new Razorpay(). Using window.onload is unreliable in WebView because it
    // can fire before externally loaded scripts have executed.
    var script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = initRazorpay;
    script.onerror = function() {
      showError('Could not load payment gateway. Check internet connection.');
      rn({ type: 'FAILED', error: 'Failed to load checkout.js. Check internet connection.' });
    };
    document.head.appendChild(script);
  </script>
</body>
</html>`;
}

// ── RazorpayModal ─────────────────────────────────────────────────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const [loading, setLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(null);

  if (!visible || !checkoutParams) return null;

  const html = buildCheckoutHTML(checkoutParams);

  function handleMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS')   onClose({ success: true,  ...msg });
      if (msg.type === 'CANCELLED') onClose({ success: false, cancelled: true });
      if (msg.type === 'FAILED')    onClose({ success: false, error: msg.error });
    } catch {
      onClose({ success: false, error: 'Unknown payment error' });
    }
  }

  function handleWebViewError(syntheticEvent) {
    const { nativeEvent } = syntheticEvent;
    setWebViewError(nativeEvent.description || 'WebView failed to load');
    onClose({ success: false, error: 'Payment page failed to load. Check your internet connection.' });
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={() => onClose({ success: false, cancelled: true })}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <TouchableOpacity onPress={() => onClose({ success: false, cancelled: true })} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loaderTxt}>Loading payment gateway…</Text>
          </View>
        )}

        <WebView
          source={{ html }}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleMessage}
          onError={handleWebViewError}
          javaScriptEnabled
          domStorageEnabled
          style={{ flex: 1 }}
          originWhitelist={['*']}
          // Allow Razorpay's checkout.razorpay.com to load inside the WebView
          mixedContentMode="always"
          // Prevent the WebView from intercepting back button before payment completes
          onShouldStartLoadWithRequest={() => true}
        />
      </View>
    </Modal>
  );
}

// ── useRazorpayCheckout hook ──────────────────────────────────────────────────
export function useRazorpayCheckout({ http: httpFn, user }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalParams,  setModalParams]  = useState(null);
  const resolverRef = useRef(null);

  function handleModalClose(result) {
    setModalVisible(false);
    setModalParams(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }

  async function initiatePayment({ amount, description, listingType, plan, couponId }) {
    return new Promise(async (resolve) => {
      resolverRef.current = resolve;
      try {
        const orderRes = await httpFn('POST', '/api/payments/order', { amount, description, listingType, plan, couponId });
        if (!orderRes?.ok) {
          resolve({ success: false, error: orderRes?.error || 'Could not create payment order.' });
          resolverRef.current = null;
          return;
        }
        // Free plan — no checkout needed
        if (orderRes.free) {
          resolve({ success: true, free: true });
          resolverRef.current = null;
          return;
        }
        // Prefer keyId from server response so APK does not need it baked in at build time
        const resolvedKeyId = orderRes.keyId || RAZORPAY_KEY_ID;
        setModalParams({
          orderId:     orderRes.orderId,
          amount:      orderRes.amount,
          currency:    'INR',
          description,
          userName:    user?.name  || '',
          userEmail:   user?.email || '',
          userPhone:   user?.phone || '',
          keyId:       resolvedKeyId,
        });
        setModalVisible(true);
        // resolve() is called by handleModalClose when user pays / cancels
      } catch {
        resolve({ success: false, error: 'Payment initialisation failed.' });
        resolverRef.current = null;
      }
    });
  }

  const RazorpayCheckout = (
    <RazorpayModal
      visible={modalVisible}
      checkoutParams={modalParams}
      onClose={handleModalClose}
    />
  );

  return { RazorpayCheckout, initiatePayment };
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#f97316',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  closeBtn:    { padding: 6 },
  closeTxt:    { fontSize: 18, color: '#fff', fontWeight: '700' },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff', zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loaderTxt: { color: '#888', fontSize: 14 },
});
