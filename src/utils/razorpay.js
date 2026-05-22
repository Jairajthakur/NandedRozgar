/**
 * razorpay.js
 *
 * Web platform fallback — used by Metro when bundling for web (expo export --platform web).
 * No react-native-webview here. Instead, we inject the Razorpay checkout.js script
 * directly into the web page's <head> and open the checkout in the same browser tab.
 *
 * API surface is identical to razorpay.native.js so all screens work unchanged.
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { RAZORPAY_KEY_ID } from './constants';

// ── Load Razorpay checkout.js script once ─────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ── Stub modal component (web doesn't need a WebView modal) ───────────────────
// We render a simple loading overlay while Razorpay's own popup is open.
export function RazorpayModal({ visible, onClose, checkoutParams }) {
  useEffect(() => {
    if (!visible || !checkoutParams) return;

    let rzp;
    loadRazorpayScript().then((loaded) => {
      if (!loaded) { onClose({ success: false, error: 'Failed to load payment gateway.' }); return; }

      rzp = new window.Razorpay({
        key:         checkoutParams.keyId,
        amount:      String(checkoutParams.amount),
        currency:    checkoutParams.currency || 'INR',
        name:        'CityPlus',
        description: checkoutParams.description || 'Listing Payment',
        order_id:    checkoutParams.orderId,
        prefill: {
          name:    checkoutParams.userName  || '',
          email:   checkoutParams.userEmail || '',
          contact: checkoutParams.userPhone || '',
        },
        theme: { color: '#f97316' },
        modal: {
          ondismiss: () => onClose({ success: false, cancelled: true }),
        },
        handler: (response) => {
          onClose({
            success:             true,
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
        },
      });

      rzp.on('payment.failed', (response) => {
        onClose({ success: false, error: response.error?.description || 'Payment failed.' });
      });

      rzp.open();
    });

    return () => { try { rzp?.close(); } catch {} };
  }, [visible, checkoutParams]);

  if (!visible) return null;

  return (
    <View style={styles.webOverlay}>
      <ActivityIndicator size="large" color="#f97316" />
      <Text style={styles.webOverlayTxt}>Opening payment gateway…</Text>
      <TouchableOpacity onPress={() => onClose({ success: false, cancelled: true })} style={styles.webCancelBtn}>
        <Text style={styles.webCancelTxt}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── useRazorpayCheckout — identical API to native version ─────────────────────
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
  webOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, gap: 16,
  },
  webOverlayTxt:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  webCancelBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
                    backgroundColor: '#fff', borderRadius: 8 },
  webCancelTxt:   { color: '#f97316', fontWeight: '700', fontSize: 14 },
});
