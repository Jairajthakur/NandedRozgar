/**
 * cashfree.native.js  (React Native / Expo)
 *
 * Cashfree payment flow for native (Android / iOS):
 *   Uses react-native-webview to open Cashfree's hosted checkout page.
 *   Intercepts the return URL to detect success / failure.
 *
 * Install: npx expo install react-native-webview
 *
 * API surface is identical to old razorpay.native.js — every screen works
 * without changes.
 *
 * Flow:
 *   1. POST /api/payments/order → { payment_session_id, order_id, amount }
 *   2. Inject HTML that auto-POSTs payment_session_id to api.cashfree.com/pg/view/sessions/checkout
 *   3. Cashfree redirects to APP_URL/payment/callback?order_id=...&status=...
 *   4. We intercept that URL and resolve success / failure
 *   5. POST /api/payments/verify/* with { cashfree_order_id }
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, SafeAreaView,
} from 'react-native';

let WebView;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// Must match APP_URL in your Railway env vars
const CALLBACK_HOST = 'thecityplus.in';   // <-- update if your domain differs
const CALLBACK_PATH = '/payment/callback';

// Cashfree hosted checkout — must be loaded via HTML POST form (not a GET URL)
// Production:  https://api.cashfree.com/pg/view/sessions/checkout
// Sandbox:     https://sandbox.cashfree.com/pg/view/sessions/checkout
const CF_CHECKOUT_ENDPOINT = 'https://api.cashfree.com/pg/view/sessions/checkout';

// Build an HTML page that auto-submits a POST form with the payment_session_id
function buildCheckoutHtml(paymentSessionId) {
  return `
    <html>
      <body onload="document.getElementById('cf').submit()">
        <form id="cf" method="POST" action="${CF_CHECKOUT_ENDPOINT}">
          <input type="hidden" name="payment_session_id" value="${paymentSessionId}" />
        </form>
      </body>
    </html>
  `;
}

// ── Payment WebView Modal ─────────────────────────────────────────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  if (!WebView) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            WebView not installed.{'\n'}
            Run: npx expo install react-native-webview
          </Text>
          <TouchableOpacity
            onPress={() => onClose({ success: false, cancelled: true })}
            style={styles.closeBtn}
          >
            <Text style={styles.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const checkoutHtml = buildCheckoutHtml(checkoutParams?.payment_session_id);

  function handleNavigationChange(navState) {
    const url = navState.url || '';
    // Intercept Cashfree return redirect: /payment/callback?order_id=XXX&status=SUCCESS|FAILED
    if (url.includes(CALLBACK_HOST) && url.includes(CALLBACK_PATH)) {
      try {
        const urlObj = new URL(url);
        const orderId = urlObj.searchParams.get('order_id') || checkoutParams?.order_id;
        const status  = (urlObj.searchParams.get('status') || '').toUpperCase();

        if (status === 'SUCCESS' && orderId) {
          onClose({
            success:           true,
            cashfree_order_id: orderId,
          });
        } else {
          onClose({ success: false, error: 'Payment was not completed.' });
        }
      } catch {
        onClose({ success: false, error: 'Could not read payment result.' });
      }
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => onClose({ success: false, cancelled: true })}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity
            onPress={() => onClose({ success: false, cancelled: true })}
            style={styles.xBtn}
          >
            <Text style={styles.xTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingTxt}>Opening payment page…</Text>
          </View>
        )}

        <WebView
          source={{ html: checkoutHtml, baseUrl: CF_CHECKOUT_ENDPOINT }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationChange}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── useRazorpayCheckout — same API, now talks to Cashfree backend ─────────────
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
        const orderRes = await httpFn('POST', '/api/payments/order', {
          amount, description, listingType, plan, couponId,
        });

        if (!orderRes?.ok) {
          resolve({ success: false, error: orderRes?.error || 'Could not create payment order.' });
          resolverRef.current = null;
          return;
        }

        if (orderRes.free) {
          resolve({ success: true, free: true });
          resolverRef.current = null;
          return;
        }

        setModalParams({
          payment_session_id: orderRes.payment_session_id,
          order_id:           orderRes.order_id,
          amount:             orderRes.amount,
        });
        setModalVisible(true);
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
  safeArea:      { flex: 1, backgroundColor: '#fff' },
  header:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  xBtn:          { padding: 4 },
  xTxt:          { color: '#fff', fontSize: 20, fontWeight: '700' },
  loadingOverlay:{
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10, gap: 12,
  },
  loadingTxt:    { color: '#f97316', fontSize: 14, fontWeight: '600' },
  errorBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText:     { fontSize: 15, textAlign: 'center', marginBottom: 20, color: '#333' },
  closeBtn:      {
    backgroundColor: '#f97316', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 8,
  },
  closeTxt:      { color: '#fff', fontWeight: '700' },
});
