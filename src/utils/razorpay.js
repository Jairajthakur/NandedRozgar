/**
 * razorpay.js — Shared Razorpay checkout utility for NandedRozgar
 *
 * Usage:
 *   import { openRazorpayCheckout } from '../utils/razorpay';
 *
 *   const result = await openRazorpayCheckout({
 *     amount:      9900,          // in paise  (₹99 = 9900)
 *     description: 'Job Listing – 15 Days',
 *     userName:    user.name,
 *     userEmail:   user.email,
 *     userPhone:   user.phone,
 *     http,                       // your existing http() helper
 *   });
 *
 *   if (result.success) {
 *     // result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature
 *   } else {
 *     // result.cancelled  → user dismissed the modal
 *     // result.error      → string message
 *   }
 *
 * ─── How Razorpay Web Checkout works in Expo / React Native ──────────────────
 * The official `react-native-razorpay` package requires bare workflow + native
 * modules (not supported in Expo Go / managed workflow).
 * The recommended cross-platform approach for Expo apps is the Web Checkout
 * script loaded inside a WebView.  This file uses that approach.
 *
 * Install:  npx expo install react-native-webview
 *           (already pulled in by many Expo packages, likely already present)
 */

import React, { useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { RAZORPAY_KEY_ID } from './constants'; // add this to constants.js

// ── HTML injected into the WebView ────────────────────────────────────────────
function buildCheckoutHTML({ orderId, amount, currency, description, userName, userEmail, userPhone, keyId }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment</title>
  <style>
    body { margin:0; background:#f5f5f5; display:flex;
           align-items:center; justify-content:center; height:100vh; }
    #loader { font-family:sans-serif; color:#888; font-size:14px; }
  </style>
</head>
<body>
  <div id="loader">Opening payment gateway…</div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var options = {
      key:         "${keyId}",
      amount:      "${amount}",
      currency:    "${currency || 'INR'}",
      name:        "NandedRozgar",
      description: "${description || 'Listing Payment'}",
      order_id:    "${orderId}",
      prefill: {
        name:  "${userName  || ''}",
        email: "${userEmail || ''}",
        contact: "${userPhone || ''}"
      },
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
        error: response.error.description || 'Payment failed',
      }));
    });
    // Auto-open the checkout modal as soon as the script loads
    window.onload = function() { rzp.open(); };
  </script>
</body>
</html>
`;
}

// ── RazorpayModal component ───────────────────────────────────────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const [loading, setLoading] = useState(true);

  if (!visible || !checkoutParams) return null;

  const html = buildCheckoutHTML(checkoutParams);

  function handleMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS')   onClose({ success: true, ...msg });
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
        {/* Header with close button */}
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

// ── Imperative helper used inside screen components ───────────────────────────
// Returns a Promise that resolves with { success, ...paymentData } or { success:false, error/cancelled }
//
// This is a low-level helper.  Screens use the useRazorpayCheckout hook instead.
export function createOrderAndPay({ amount, description, userName, userEmail, userPhone, http, setModalParams, setModalVisible }) {
  return new Promise(async (resolve) => {
    try {
      // Step 1 — ask backend to create a Razorpay order
      const orderRes = await http('POST', '/api/payments/order', { amount, description });
      if (!orderRes?.ok) {
        return resolve({ success: false, error: orderRes?.error || 'Could not create payment order.' });
      }

      // Free plan — no payment needed
      if (orderRes.free) {
        return resolve({ success: true, free: true });
      }

      // Step 2 — open Razorpay checkout WebView
      setModalParams({
        orderId:     orderRes.orderId,
        amount:      orderRes.amount,
        currency:    'INR',
        description,
        userName,
        userEmail,
        userPhone,
        keyId:       RAZORPAY_KEY_ID,
      });
      setModalVisible(true);

      // Resolution happens via onClose callback set in useRazorpayCheckout
      // We store the resolver on the window object as a bridge
      window.__rzpResolve = resolve;
    } catch (err) {
      resolve({ success: false, error: 'Payment initialisation failed.' });
    }
  });
}

// ── useRazorpayCheckout hook ──────────────────────────────────────────────────
// Drop this into any screen that needs Razorpay.
//
//   const { RazorpayCheckout, initiatePayment } = useRazorpayCheckout({ http, user });
//
//   // In JSX:
//   {RazorpayCheckout}
//
//   // To pay:
//   const result = await initiatePayment({ amount: 9900, description: 'Job – 15 Days' });
//   if (result.success) { /* proceed */ }
export function useRazorpayCheckout({ http, user }) {
  const [modalVisible, setModalVisible]   = useState(false);
  const [modalParams,  setModalParams]    = useState(null);
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
        // Step 1 — create order on backend
        const orderRes = await http('POST', '/api/payments/order', { amount, description });
        if (!orderRes?.ok) {
          resolve({ success: false, error: orderRes?.error || 'Could not create payment order.' });
          resolverRef.current = null;
          return;
        }
        // Free plan
        if (orderRes.free) {
          resolve({ success: true, free: true });
          resolverRef.current = null;
          return;
        }
        // Step 2 — open modal
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12,
    backgroundColor: '#f97316',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  closeBtn:   { padding: 6 },
  closeTxt:   { fontSize: 18, color: '#fff', fontWeight: '700' },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff', zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loaderTxt: { color: '#888', fontSize: 14 },
});
