/**
 * cashfree.js  (web)
 *
 * Cashfree payment flow for web:
 *   1. POST /api/payments/order  → { ok, free } or { ok, payment_session_id, order_id, amount }
 *   2. We load the Cashfree JS SDK and open the checkout drop
 *   3. Cashfree calls our onSuccess / onFailure callbacks
 *   4. On success we POST /api/payments/verify/* with { cashfree_order_id, cashfree_payment_id }
 *
 * Drop-in JS SDK docs:
 *   https://docs.cashfree.com/docs/web-drop-in
 *
 * API surface is intentionally identical to the old razorpay.js so every
 * screen works without changes — just swap the import path.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';

// ── Load Cashfree Drop-in JS SDK ─────────────────────────────────────────────
function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.__cashfreeSdkLoaded) { resolve(); return; }
    const script = document.createElement('script');
    // production SDK — change to sandbox URL for testing:
    // https://sdk.cashfree.com/js/v3/cashfree.sandbox.js
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload  = () => { window.__cashfreeSdkLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

// ── CashfreeModal — renders inside the current page (drop-in) ────────────────
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const containerRef = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [sdkError, setSdkError] = useState('');

  useEffect(() => {
    if (!visible || !checkoutParams?.payment_session_id) return;
    let cashfree;

    async function initCheckout() {
      try {
        await loadCashfreeSDK();
        // eslint-disable-next-line no-undef
        cashfree = Cashfree({ mode: 'production' }); // change to 'sandbox' for testing

        setLoading(false);

        cashfree.checkout({
          paymentSessionId: checkoutParams.payment_session_id,
          redirectTarget:   '_modal',          // opens as a modal overlay
        }).then(result => {
          if (result?.error) {
            onClose({ success: false, error: result.error.message || 'Payment failed.' });
          } else if (result?.redirect) {
            // handled by Cashfree redirect — should not reach here in modal mode
            onClose({ success: false, error: 'Unexpected redirect.' });
          } else {
            // Payment successful — result.paymentDetails has order_id etc.
            onClose({
              success:              true,
              cashfree_order_id:    checkoutParams.order_id,
              cashfree_payment_id:  result?.paymentDetails?.paymentMessage || '',
            });
          }
        });
      } catch (err) {
        setSdkError(err.message || 'Could not load payment gateway.');
        setLoading(false);
      }
    }

    initCheckout();
    // cleanup: nothing to destroy for drop-in modal
  }, [visible, checkoutParams]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container} ref={containerRef}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity
            onPress={() => onClose({ success: false, cancelled: true })}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading && !sdkError && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingTxt}>Opening payment gateway…</Text>
          </View>
        )}

        {!!sdkError && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTxt}>{sdkError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => onClose({ success: false, cancelled: true })}
            >
              <Text style={styles.retryTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cashfree drop-in renders itself as an overlay on top of the page */}
        {/* This container is just a placeholder while loading */}
      </View>
    </View>
  );
}

// ── useRazorpayCheckout — same hook name/API so screens need zero changes ─────
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
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    width: '92%', maxWidth: 480,
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    minHeight: 180,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 13,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeBtn:    { padding: 4 },
  closeText:   { color: '#fff', fontSize: 18, fontWeight: '700' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  loadingTxt:  { color: '#888', fontSize: 14 },
  errorWrap:   { alignItems: 'center', padding: 24, gap: 16 },
  errorTxt:    { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  retryBtn:    { backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryTxt:    { color: '#fff', fontWeight: '700' },
});
