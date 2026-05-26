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
// Escapes backslashes, double-quotes, single-quotes, and HTML angle brackets.
// This prevents user-supplied data (name, email, phone, description) from
// breaking out of the JS string context inside the injected HTML page.
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
// All dynamic values are passed via a <script id="cfg"> JSON block and read by
// the inline script, completely avoiding string-interpolation injection.
function buildCheckoutHTML({ orderId, amount, currency, description, userName, userEmail, userPhone, keyId }) {
  // Encode the options as JSON and embed in a <script type="application/json">
  // element. The inline JS reads it with JSON.parse — no string interpolation of
  // user data anywhere in the JS execution context.
  const cfg = JSON.stringify({
    key:         escapeForJS(keyId),
    amount:      String(amount),
    currency:    escapeForJS(currency || 'INR'),
    name:        'CityPlus',
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment</title>
  <style>
    body { margin:0; background:#f5f5f5; display:flex;
           align-items:center; justify-content:center; height:100vh; }
    #loader { font-family:sans-serif; color:#888; font-size:14px; text-align:center; }
  </style>
</head>
<body>
  <div id="loader">Opening payment gateway…</div>
  <script type="application/json" id="rzp-cfg">${cfg}</script>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var opts = JSON.parse(document.getElementById('rzp-cfg').textContent);
    var options = {
      key:         opts.key,
      amount:      opts.amount,
      currency:    opts.currency,
      name:        opts.name,
      description: opts.description,
      order_id:    opts.order_id,
      prefill:     opts.prefill,
      theme: { color: "#f97316" },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CANCELLED' }));
        }
      },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:                 'SUCCESS',
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        }));
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type:  'FAILED',
        error: (response.error && response.error.description) || 'Payment failed',
      }));
    });
    window.onload = function() { rzp.open(); };
  </script>
</body>
</html>`;
}

// ── RazorpayModal ─────────────────────────────────────────────────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const [loading, setLoading] = useState(true);

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
          javaScriptEnabled
          domStorageEnabled
          style={{ flex: 1 }}
          originWhitelist={['*']}
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

  async function initiatePayment({ amount, description }) {
    return new Promise(async (resolve) => {
      resolverRef.current = resolve;
      try {
        const orderRes = await httpFn('POST', '/api/payments/order', { amount, description });
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
        setModalParams({
          orderId:     orderRes.orderId,
          amount:      orderRes.amount,
          currency:    'INR',
          description,
          userName:    user?.name  || '',
          userEmail:   user?.email || '',
          userPhone:   user?.phone || '',
          keyId:       RAZORPAY_KEY_ID,
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
