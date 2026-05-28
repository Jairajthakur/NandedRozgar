/**
 * instamojo.native.js — React Native Instamojo checkout via WebView
 *
 * Instamojo doesn't have a native SDK — we use react-native-webview.
 * After payment, Instamojo redirects to APP_URL/payment/callback?...
 * We intercept that URL in the WebView and extract payment details.
 *
 * Install: npx expo install react-native-webview
 */

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, SafeAreaView } from 'react-native';

let WebView;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// The callback URL must match APP_URL in your .env / Railway vars
const CALLBACK_HOST = 'thecityplus.in';
const CALLBACK_PATH = '/payment/callback';

// ── Payment WebView Modal ─────────────────────────────────────────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  if (!WebView) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            WebView not installed.{'\n'}Run: npx expo install react-native-webview
          </Text>
          <TouchableOpacity onPress={() => onClose({ success: false, cancelled: true })} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  function handleNavigationChange(navState) {
    const url = navState.url || '';
    // Intercept Instamojo redirect: /payment/callback?payment_id=XXX&payment_request_id=YYY&payment_status=Credit
    if (url.includes(CALLBACK_HOST) && url.includes(CALLBACK_PATH)) {
      try {
        const urlObj = new URL(url);
        const paymentId        = urlObj.searchParams.get('payment_id');
        const paymentRequestId = urlObj.searchParams.get('payment_request_id');
        const paymentStatus    = urlObj.searchParams.get('payment_status');

        if (paymentStatus === 'Credit' && paymentId) {
          onClose({ success: true, payment_id: paymentId, payment_request_id: paymentRequestId });
        } else {
          onClose({ success: false, error: 'Payment was not completed.' });
        }
      } catch {
        onClose({ success: false, error: 'Could not read payment result.' });
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose({ success: false, cancelled: true })}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity onPress={() => onClose({ success: false, cancelled: true })} style={styles.xBtn}>
            <Text style={styles.xTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingTxt}>Opening payment page…</Text>
          </View>
        )}

        <WebView
          source={{ uri: checkoutParams?.longurl }}
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

// ── useRazorpayCheckout — same API, works with Instamojo backend ──────────────
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
        if (orderRes.free) {
          resolve({ success: true, free: true });
          resolverRef.current = null;
          return;
        }
        setModalParams({
          longurl:          orderRes.longurl,
          paymentRequestId: orderRes.paymentRequestId,
          amount:           orderRes.amount,
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
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  xBtn:          { padding: 4 },
  xTxt:          { color: '#fff', fontSize: 20, fontWeight: '700' },
  loadingOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)',
                   alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
  loadingTxt:    { color: '#f97316', fontSize: 14, fontWeight: '600' },
  errorBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText:     { fontSize: 15, textAlign: 'center', marginBottom: 20, color: '#333' },
  closeBtn:      { backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  closeTxt:      { color: '#fff', fontWeight: '700' },
});
