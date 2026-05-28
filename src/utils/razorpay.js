/**
 * instamojo.js (web) — replaces razorpay.js
 *
 * Instamojo payment flow for web:
 *   1. /order returns a `longurl`
 *   2. We open the longurl in an iframe/new tab
 *   3. After payment, Instamojo redirects to APP_URL/payment/callback?payment_id=&payment_request_id=&payment_status=
 *   4. We listen for a postMessage from that page, or poll for URL change
 *
 * API surface is identical to old razorpay.js so all screens work unchanged.
 * Screens send `payment_id` and `payment_request_id` to verify routes.
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';

export function RazorpayModal({ visible, onClose, checkoutParams }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!visible || !checkoutParams?.longurl) return;

    // Listen for payment callback via postMessage (set up on your callback page)
    function handleMessage(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'instamojo_payment') {
          if (data.payment_status === 'Credit') {
            onClose({
              success:            true,
              payment_id:         data.payment_id,
              payment_request_id: data.payment_request_id,
            });
          } else {
            onClose({ success: false, error: 'Payment was not successful.' });
          }
        }
      } catch {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [visible, checkoutParams]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity onPress={() => onClose({ success: false, cancelled: true })} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <iframe
          ref={iframeRef}
          src={checkoutParams?.longurl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Instamojo Payment"
        />
      </View>
    </View>
  );
}

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
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    width: '92%', height: '88%',
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeBtn:    { padding: 4 },
  closeText:   { color: '#fff', fontSize: 18, fontWeight: '700' },
});
