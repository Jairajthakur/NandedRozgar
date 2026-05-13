// ── ReferralScreen.js ─────────────────────────────────────────────────────────
// Shows user's referral code, lets them copy + share via WhatsApp.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, Alert, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

const ORANGE = '#f97316';

function getReferralCode(user) {
  if (!user?.id) return 'NANDED100';
  // Deterministic code from user id
  return 'NR' + String(user.id).slice(-4).toUpperCase().padStart(4, '0');
}

export default function ReferralScreen() {
  const { user } = useAuth();
  const code = getReferralCode(user);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // fallback — Clipboard may not be available in Expo Go
    }
    setCopied(true);
    Toast.show({ type: 'success', text1: '✅ Referral code copied!' });
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `🎯 Join NandedRozgar — Find jobs, rooms & cars in Nanded!\n\nUse my referral code *${code}* when you sign up and we both get a FREE boosted listing!\n\nDownload: https://nandedrozgar.com`
    );
    Linking.openURL(`https://wa.me/?text=${msg}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please share the code manually.')
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20 }}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroEmoji}>🎁</Text>
        <Text style={s.heroTitle}>Invite & Earn</Text>
        <Text style={s.heroSub}>
          Invite a friend to NandedRozgar. When they post their first listing,
          you both get a <Text style={{ fontWeight: '800', color: ORANGE }}>FREE Boosted Listing</Text> worth ₹49!
        </Text>
      </View>

      {/* Code box */}
      <View style={s.codeBox}>
        <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
        <Text style={s.code}>{code}</Text>
        <TouchableOpacity style={s.copyBtn} onPress={copyCode} activeOpacity={0.8}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
          <Text style={s.copyTxt}>{copied ? 'Copied!' : 'Copy Code'}</Text>
        </TouchableOpacity>
      </View>

      {/* WhatsApp share */}
      <TouchableOpacity style={s.waBtn} onPress={shareWhatsApp} activeOpacity={0.85}>
        <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        <Text style={s.waTxt}>Share via WhatsApp</Text>
      </TouchableOpacity>

      {/* How it works */}
      <Text style={s.howTitle}>How it works</Text>
      {[
        { icon: 'share-social', text: 'Share your code with a friend' },
        { icon: 'person-add',   text: 'They sign up using your code' },
        { icon: 'briefcase',    text: 'They post their first listing' },
        { icon: 'gift',         text: 'You both get a FREE Boost!' },
      ].map((step, i) => (
        <View key={i} style={s.step}>
          <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
          <Ionicons name={step.icon} size={18} color={ORANGE} style={{ marginRight: 10 }} />
          <Text style={s.stepTxt}>{step.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  hero: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#ebebeb', padding: 20, marginBottom: 16, alignItems: 'center' },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  codeBox: { backgroundColor: '#111', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12 },
  codeLabel: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1.2, marginBottom: 10 },
  code: { fontSize: 32, fontWeight: '900', color: ORANGE, letterSpacing: 4, marginBottom: 16 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  copyTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25d366', borderRadius: 14, paddingVertical: 14, marginBottom: 24 },
  waTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  howTitle: { fontSize: 13, fontWeight: '700', color: '#999', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', padding: 14, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff3e8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumTxt: { fontSize: 12, fontWeight: '800', color: ORANGE },
  stepTxt: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
});
