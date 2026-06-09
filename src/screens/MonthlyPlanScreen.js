/**
 * MonthlyPlanScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ₹299/month plan — lets users buy a monthly subscription that makes
 * all posts (Jobs, Rooms, Cars, Buy-Sell) FREE for 30 days.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { http as apiHttp } from '../utils/api';
import { RazorpayModal } from '../utils/cashfree';

const ORANGE = '#f97316';
const GOLD   = '#f59e0b';
const DARK   = '#1a1a1a';
const PLAN_PRICE = 299;

const FEATURES = [
  { icon: 'briefcase-outline',    label: 'Unlimited Job Postings',           sub: 'Post as many jobs as you want' },
  { icon: 'home-outline',         label: 'Unlimited Room Listings',          sub: 'List all your rental properties' },
  { icon: 'car-outline',          label: 'Unlimited Car/Vehicle Ads',        sub: 'Sell vehicles without paying per ad' },
  { icon: 'bag-handle-outline',   label: 'Unlimited Buy-Sell Posts',         sub: 'List anything for free' },
  { icon: 'flash-outline',        label: 'All Posts Live for 30 Days',       sub: 'Full visibility, no expiry during plan' },
  { icon: 'shield-checkmark-outline', label: 'Priority Listing',             sub: 'Your posts appear at the top' },
];

export default function MonthlyPlanScreen({ navigation }) {
  const { user } = useAuth();

  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [active,    setActive]    = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalParams,  setModalParams]  = useState(null);

  const shimmer = useRef(new Animated.Value(0)).current;
  const resolverRef = useRef(null);

  // Shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shimmer, { toValue: 0, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  // Check current plan status
  // Step 1: read AsyncStorage cache immediately so the screen renders without
  //         waiting for the network (fixes the "stuck on spinner" issue on slow
  //         connections / Railway cold-starts).
  // Step 2: refresh from the API in the background and update state if it differs.
  useEffect(() => {
    (async () => {
      // ── Fast path: show cached value immediately ──────────────────────────
      try {
        const [cachedActive, cachedExpiry] = await Promise.all([
          AsyncStorage.getItem('monthly_plan_active'),
          AsyncStorage.getItem('monthly_plan_expires_at'),
        ]);
        if (cachedActive !== null) {
          setActive(cachedActive === 'true');
          if (cachedExpiry) setExpiresAt(cachedExpiry);
          setChecking(false); // show the screen right away with cached data
        }
      } catch {}

      // ── Slow path: verify with server in background ───────────────────────
      // Only call the API when the user is known (token exists); if user is
      // null the request will fail with 401 and is pointless.
      if (!user) {
        setChecking(false); // ensure spinner stops even with no user
        return;
      }
      try {
        const data = await apiHttp('GET', '/api/payments/monthly-plan/status');
        const serverActive  = data.active === true;
        const serverExpiry  = data.expiresAt || null;
        setActive(serverActive);
        setExpiresAt(serverExpiry);
        await AsyncStorage.setItem('monthly_plan_active', serverActive ? 'true' : 'false');
        if (serverExpiry) {
          await AsyncStorage.setItem('monthly_plan_expires_at', serverExpiry);
        } else {
          await AsyncStorage.removeItem('monthly_plan_expires_at');
        }
      } catch {}
      setChecking(false); // ensure spinner stops even if API failed
    })();
  }, [user]);

  // Use apiHttp from utils/api.js which auto-loads the token from SecureStore

  async function handleBuyPlan() {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to buy the monthly plan.');
      return;
    }
    setLoading(true);
    try {
      const orderRes = await apiHttp('POST', '/api/payments/order/monthly-plan', {});
      if (!orderRes?.ok) {
        Alert.alert('Error', orderRes?.error || 'Could not create payment order.');
        setLoading(false);
        return;
      }

      // Open payment modal
      await new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalParams({
          payment_session_id: orderRes.paymentSessionId,
          order_id:           orderRes.orderId,
          amount:             PLAN_PRICE,
        });
        setModalVisible(true);
      });
    } catch (err) {
      Alert.alert('Error', 'Payment initialisation failed. Please try again.');
    }
    setLoading(false);
  }

  async function handleModalClose(result) {
    setModalVisible(false);
    setModalParams(null);

    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }

    if (!result?.success) {
      if (!result?.cancelled) {
        Alert.alert('Payment Failed', result?.error || 'Payment could not be completed.');
      }
      return;
    }

    // Verify
    setLoading(true);
    try {
      const verifyRes = await apiHttp('POST', '/api/payments/verify/monthly-plan', {
        cashfree_order_id: result.cashfree_order_id,
      });
      if (verifyRes?.ok) {
        await AsyncStorage.setItem('monthly_plan_active', 'true');
        if (verifyRes.expiresAt) {
          await AsyncStorage.setItem('monthly_plan_expires_at', verifyRes.expiresAt);
        }
        setActive(true);
        setExpiresAt(verifyRes.expiresAt);
        Alert.alert(
          '🎉 Plan Activated!',
          'Your Monthly Plan is now active! All posts for the next 30 days are completely free.',
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Verification Failed', verifyRes?.error || 'Payment received but verification failed. Please contact support.');
      }
    } catch {
      Alert.alert('Error', 'Could not verify payment. Please contact support.');
    }
    setLoading(false);
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  if (checking) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.back} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Monthly Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Banner */}
        <View style={s.hero}>
          {/* Stripes */}
          <View style={[s.stripe, { top: 0,  right: 40 }]} />
          <View style={[s.stripe, { top: 30, right: 80 }]} />
          <View style={[s.stripe, { top: 15, right: 10 }]} />

          <Animated.Text style={[s.heroEmoji, {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          }]}>🚀</Animated.Text>
          <Text style={s.heroHeadline}>Post Everything{'\n'}Absolutely <Text style={{ color: GOLD }}>FREE!</Text></Text>
          <Text style={s.heroSub}>One plan for Jobs · Rooms · Cars · Buy-Sell</Text>

          {/* Price tag */}
          <Animated.View style={[s.pricePill, {
            transform: [{
              scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
            }],
          }]}>
            <Text style={s.priceAmt}>₹{PLAN_PRICE}</Text>
            <Text style={s.pricePer}>/month</Text>
          </Animated.View>
        </View>

        {/* Active plan badge */}
        {active && (
          <View style={s.activeBadge}>
            <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={s.activeTitle}>Plan Active ✓</Text>
              {expiresAt && (
                <Text style={s.activeSub}>Valid until {formatDate(expiresAt)}</Text>
              )}
            </View>
          </View>
        )}

        {/* Features */}
        <Text style={s.sectionTitle}>What's Included</Text>
        <View style={s.featureGrid}>
          {FEATURES.map(f => (
            <View key={f.label} style={s.featureCard}>
              <View style={s.featureIconWrap}>
                <Ionicons name={f.icon} size={22} color={ORANGE} />
              </View>
              <Text style={s.featureLabel}>{f.label}</Text>
              <Text style={s.featureSub}>{f.sub}</Text>
            </View>
          ))}
        </View>

        {/* Value comparison */}
        <View style={s.compareBox}>
          <Text style={s.compareTitle}>Value Comparison</Text>
          <View style={s.compareRow}>
            <Text style={s.compareItem}>❌ Without plan</Text>
            <Text style={s.comparePrice}>₹49–₹119 per post</Text>
          </View>
          <View style={s.compareDivider} />
          <View style={s.compareRow}>
            <Text style={[s.compareItem, { color: '#10b981' }]}>✅ Monthly plan</Text>
            <Text style={[s.comparePrice, { color: '#10b981', fontWeight: '900' }]}>₹0 per post!</Text>
          </View>
          <Text style={s.compareNote}>
            Post 10+ listings and you already save more than ₹{PLAN_PRICE}
          </Text>
        </View>

        {/* CTA button */}
        {!active ? (
          <TouchableOpacity
            style={[s.ctaBtn, loading && { opacity: 0.7 }]}
            onPress={handleBuyPlan}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={s.ctaTxt}>Activate Monthly Plan — ₹{PLAN_PRICE}</Text>
                </>
              )
            }
          </TouchableOpacity>
        ) : (
          <View style={s.renewBox}>
            <Ionicons name="refresh-outline" size={18} color={ORANGE} />
            <Text style={s.renewTxt}>
              Your plan auto-expires on {formatDate(expiresAt)}.{'\n'}
              You can renew anytime after expiry.
            </Text>
          </View>
        )}

        <Text style={s.disclaimer}>
          • No auto-renewal · One-time payment per month{'\n'}
          • Plan activates instantly after payment{'\n'}
          • Valid for 30 days from activation date
        </Text>

      </ScrollView>

      {/* Payment modal */}
      <RazorpayModal
        visible={modalVisible}
        checkoutParams={modalParams}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f5f3ef' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 14,
  },
  back:        { width: 36, alignItems: 'flex-start' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Hero
  hero: {
    backgroundColor: DARK,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  stripe: {
    position: 'absolute', width: 2.5, height: '200%',
    backgroundColor: ORANGE, opacity: 0.12,
    transform: [{ rotate: '15deg' }],
  },
  heroEmoji:    { fontSize: 52, marginBottom: 4 },
  heroHeadline: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 36 },
  heroSub:      { fontSize: 13, color: '#aaa', textAlign: 'center', fontWeight: '500' },
  pricePill: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: ORANGE, borderRadius: 30,
    paddingHorizontal: 22, paddingVertical: 12,
    marginTop: 12, gap: 2,
    elevation: 8, shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 10,
  },
  priceAmt: { fontSize: 30, fontWeight: '900', color: '#fff' },
  pricePer: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },

  // Active badge
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#6ee7b7', marginHorizontal: 16, marginTop: 16,
    padding: 14,
  },
  activeTitle: { fontSize: 15, fontWeight: '800', color: '#065f46' },
  activeSub:   { fontSize: 12, color: '#059669', marginTop: 2 },

  // Features
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: DARK,
    marginHorizontal: 16, marginTop: 20, marginBottom: 12,
  },
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10,
  },
  featureCard: {
    width: '47%',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e8e4dd', padding: 14, gap: 6,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 13, fontWeight: '700', color: DARK },
  featureSub:   { fontSize: 11, color: '#888', lineHeight: 16 },

  // Compare
  compareBox: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e8e4dd', margin: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  compareTitle:   { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 12 },
  compareRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  compareItem:    { fontSize: 13, color: '#555', fontWeight: '600' },
  comparePrice:   { fontSize: 13, color: '#888', fontWeight: '700' },
  compareDivider: { height: 1, backgroundColor: '#f0ece6', marginVertical: 4 },
  compareNote:    { fontSize: 11, color: '#888', marginTop: 10, fontStyle: 'italic' },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ORANGE, borderRadius: 28,
    marginHorizontal: 16, marginTop: 8, paddingVertical: 16,
    elevation: 6, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 10,
  },
  ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  // Renew info
  renewBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff8f0', borderRadius: 14, borderWidth: 1,
    borderColor: '#fed7aa', marginHorizontal: 16, marginTop: 8, padding: 14,
  },
  renewTxt: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 20 },

  // Disclaimer
  disclaimer: {
    fontSize: 11, color: '#aaa', textAlign: 'center',
    marginHorizontal: 24, marginTop: 16, lineHeight: 18,
  },
});
