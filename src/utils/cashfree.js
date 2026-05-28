/**
 * cashfree.js  — Cashfree payment for React Native (APK) + Web
 *
 * ─── HOW IT WORKS ────────────────────────────────────────────────────────────
 *
 *  Native (Android / iOS APK):
 *    Uses a full-screen WebView that loads the Cashfree Drop-in JS SDK.
 *    The WebView injects a tiny postMessage bridge so the JS inside the
 *    WebView can communicate payment results back to React Native.
 *
 *  Web (browser):
 *    Dynamically loads the Cashfree JS SDK script tag and opens the
 *    drop-in modal overlay — same as before.
 *
 *  The exported hook `useRazorpayCheckout` keeps an IDENTICAL API so every
 *  screen (PostJobScreen, PostRoomScreen, PostCarScreen, PostItemScreen,
 *  PromoteBusinessScreen) works without ANY changes.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 *
 *  1. react-native-webview is already in package.json — nothing to install.
 *
 *  2. On Railway set these Variables:
 *       CASHFREE_APP_ID      = <your production App ID>
 *       CASHFREE_SECRET_KEY  = <your production Secret Key>
 *       NODE_ENV             = production
 *       APP_URL              = https://thecityplus.in
 *
 *  3. In eas.json the preview + production env blocks already have
 *       NODE_ENV = "production"
 *     so no changes needed there.
 *
 * ─── CASHFREE DOCS ───────────────────────────────────────────────────────────
 *   https://docs.cashfree.com/docs/web-drop-in
 *   https://docs.cashfree.com/docs/react-native-integration
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Modal, SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === 'web';

// ── Change 'production' → 'sandbox' (and SDK URL) while testing ──────────────
const CF_MODE    = 'production';
const CF_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
// For sandbox testing use:
// const CF_MODE    = 'sandbox';
// const CF_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.sandbox.js';

// ─────────────────────────────────────────────────────────────────────────────
// WEB helper — loads Cashfree drop-in JS SDK in the browser
// ─────────────────────────────────────────────────────────────────────────────

function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.__cashfreeSdkLoaded) { resolve(); return; }
    const script = document.createElement('script');
    script.src   = CF_SDK_URL;
    script.async = true;
    script.onload  = () => { window.__cashfreeSdkLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML injected into the WebView (native only)
// ─────────────────────────────────────────────────────────────────────────────
// The WebView loads this self-contained HTML page which:
//  1. Loads the Cashfree JS SDK from CDN
//  2. Opens the checkout with the payment_session_id
//  3. Posts the result back to React Native via ReactNativeWebView.postMessage

function buildCheckoutHTML(paymentSessionId, orderId) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Complete Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff8f5;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px;
    }
    .loader {
      display: flex; flex-direction: column;
      align-items: center; gap: 16px;
    }
    .spinner {
      width: 44px; height: 44px;
      border: 4px solid #fed7aa;
      border-top-color: #f97316;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .label { color: #f97316; font-size: 15px; font-weight: 600; }
    .sub   { color: #888; font-size: 13px; margin-top: 4px; }
    .error-box {
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 12px; padding: 24px; text-align: center; max-width: 320px;
    }
    .error-title { color: #dc2626; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .error-msg   { color: #666; font-size: 13px; margin-bottom: 16px; }
    .btn {
      background: #f97316; color: #fff;
      border: none; border-radius: 8px;
      padding: 10px 24px; font-size: 14px; font-weight: 700;
      cursor: pointer;
    }
    #loader { display: flex; }
    #error  { display: none; }
  </style>
</head>
<body>
  <div id="loader" class="loader">
    <div class="spinner"></div>
    <div>
      <p class="label">Opening payment page…</p>
      <p class="sub">Secured by Cashfree Payments</p>
    </div>
  </div>
  <div id="error" class="error-box">
    <p class="error-title">Payment Gateway Error</p>
    <p class="error-msg" id="error-msg">Could not load payment gateway.</p>
    <button class="btn" onclick="sendCancel()">Go Back</button>
  </div>

  <script src="${CF_SDK_URL}"></script>
  <script>
    var ORDER_ID = ${JSON.stringify(orderId)};
    var SESSION_ID = ${JSON.stringify(paymentSessionId)};

    function post(data) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      } catch(e) {}
    }

    function sendCancel() {
      post({ type: 'cashfree_cancel' });
    }

    function showError(msg) {
      document.getElementById('loader').style.display = 'none';
      document.getElementById('error').style.display  = 'block';
      document.getElementById('error-msg').textContent = msg || 'Could not load payment gateway.';
    }

    window.addEventListener('load', function() {
      try {
        if (typeof Cashfree === 'undefined') {
          showError('Payment SDK failed to load. Please check your internet connection.');
          return;
        }

        var cashfree = Cashfree({ mode: '${CF_MODE}' });

        // Hide loader NOW — before checkout opens, not after it resolves.
        // Previously the spinner stayed on top of the Cashfree UI the whole time.
        document.getElementById('loader').style.display = 'none';

        cashfree.checkout({
          paymentSessionId: SESSION_ID,
          redirectTarget: '_modal',
        }).then(function(result) {
          if (result && result.error) {
            post({
              type: 'cashfree_error',
              error: result.error.message || 'Payment failed.',
            });
          } else if (result && result.redirect) {
            post({ type: 'cashfree_error', error: 'Unexpected redirect from payment gateway.' });
          } else {
            post({
              type:              'cashfree_success',
              cashfree_order_id: ORDER_ID,
              cashfree_payment_id: (result && result.paymentDetails && result.paymentDetails.paymentMessage) || '',
            });
          }
        }).catch(function(err) {
          showError(err && err.message ? err.message : 'Payment could not be completed.');
          post({ type: 'cashfree_error', error: err && err.message ? err.message : 'Payment failed.' });
        });
      } catch(e) {
        showError(e.message || 'Unexpected error starting payment.');
        post({ type: 'cashfree_error', error: e.message || 'Unexpected error.' });
      }
    });
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIVE — Full-screen WebView payment modal
// ─────────────────────────────────────────────────────────────────────────────

function NativePaymentModal({ visible, checkoutParams, onClose }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) setLoading(true);
  }, [visible]);

  if (!visible || !checkoutParams) return null;

  const html = buildCheckoutHTML(
    checkoutParams.payment_session_id,
    checkoutParams.order_id,
  );

  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'cashfree_success') {
        onClose({ success: true, cashfree_order_id: data.cashfree_order_id, cashfree_payment_id: data.cashfree_payment_id });
      } else if (data.type === 'cashfree_error') {
        onClose({ success: false, error: data.error || 'Payment failed.' });
      } else if (data.type === 'cashfree_cancel') {
        onClose({ success: false, cancelled: true });
      }
    } catch {}
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => onClose({ success: false, cancelled: true })}
    >
      <SafeAreaView style={styles.modalSafe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity
            onPress={() => onClose({ success: false, cancelled: true })}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingTxt}>Opening payment gateway…</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          style={styles.webview}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          // Allow loading Cashfree CDN
          mixedContentMode="always"
          // Prevent white flash
          backgroundColor="#fff8f5"
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB — Drop-in overlay (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

function WebPaymentModal({ visible, checkoutParams, onClose }) {
  const [loading,  setLoading]  = useState(true);
  const [sdkError, setSdkError] = useState('');

  useEffect(() => {
    if (!visible || !checkoutParams?.payment_session_id) return;

    async function initCheckout() {
      try {
        await loadCashfreeSDK();
        // eslint-disable-next-line no-undef
        const cashfree = Cashfree({ mode: CF_MODE });
        setLoading(false);
        cashfree.checkout({
          paymentSessionId: checkoutParams.payment_session_id,
          redirectTarget: '_modal',
        }).then(result => {
          if (result?.error) {
            onClose({ success: false, error: result.error.message || 'Payment failed.' });
          } else if (result?.redirect) {
            onClose({ success: false, error: 'Unexpected redirect.' });
          } else {
            onClose({
              success:             true,
              cashfree_order_id:   checkoutParams.order_id,
              cashfree_payment_id: result?.paymentDetails?.paymentMessage || '',
            });
          }
        });
      } catch (err) {
        setSdkError(err.message || 'Could not load payment gateway.');
        setLoading(false);
      }
    }

    initCheckout();
  }, [visible, checkoutParams]);

  if (!visible) return null;

  return (
    <View style={styles.webOverlay}>
      <View style={styles.webContainer}>
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
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified RazorpayModal — picks native or web automatically
// ─────────────────────────────────────────────────────────────────────────────

export function RazorpayModal({ visible, onClose, checkoutParams }) {
  if (IS_WEB) {
    return <WebPaymentModal visible={visible} checkoutParams={checkoutParams} onClose={onClose} />;
  }
  return <NativePaymentModal visible={visible} checkoutParams={checkoutParams} onClose={onClose} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// useRazorpayCheckout — same API, every screen unchanged
// ─────────────────────────────────────────────────────────────────────────────

export function useRazorpayCheckout({ http: httpFn }) {
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

  async function initiatePayment({ description, listingType, plan, couponId }) {
    return new Promise(async (resolve) => {
      resolverRef.current = resolve;
      try {
        const orderRes = await httpFn('POST', '/api/payments/order', {
          description, listingType, plan, couponId,
        });

        if (!orderRes?.ok) {
          resolverRef.current = null;
          return resolve({ success: false, error: orderRes?.error || 'Could not create payment order.' });
        }

        // Free plan or fully covered by credits — no payment needed
        if (orderRes.free) {
          resolverRef.current = null;
          return resolve({ success: true, free: true });
        }

        if (!orderRes.payment_session_id) {
          resolverRef.current = null;
          return resolve({ success: false, error: 'Payment gateway returned no session. Please contact support.' });
        }

        setModalParams({
          payment_session_id: orderRes.payment_session_id,
          order_id:           orderRes.order_id,
          amount:             orderRes.amount,
        });
        setModalVisible(true);
      } catch (err) {
        resolverRef.current = null;
        resolve({ success: false, error: 'Payment initialisation failed.' });
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Native modal
  modalSafe: {
    flex: 1,
    backgroundColor: '#fff8f5',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff8f5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff8f5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 10,
  },

  // Web overlay
  webOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  webContainer: {
    width: '92%', maxWidth: 480,
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    minHeight: 180,
  },

  // Shared
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
