import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#f97316';

export default function ReferralScreen() {
  const { user } = useAuth();
  const code = `NR${(user?.id || '0000').toString().slice(0, 4).toUpperCase()}`;

  async function copyCode() {
    await Clipboard.setStringAsync(code);
    Toast.show({ type: 'success', text1: 'Code copied!' });
  }

  async function shareCode() {
    await Share.share({
      message: `Use my referral code ${code} on NandedRozgar to find jobs, rooms & more in Nanded! Download the app now.`,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift-outline" size={36} color={ORANGE} />
        </View>
        <Text style={styles.title}>Refer Friends & Earn</Text>
        <Text style={styles.sub}>Share your code. When your friend posts a job, you both get benefits!</Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Text style={styles.code}>{code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
            <Ionicons name="copy-outline" size={16} color={ORANGE} />
            <Text style={styles.copyTxt}>Copy Code</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.shareTxt}>Share with Friends</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.howCard}>
        <Text style={styles.howTitle}>How it works</Text>
        {[
          { n: '1', t: 'Share your code', s: 'Send it to friends in Nanded' },
          { n: '2', t: 'Friend signs up', s: 'They use your code during registration' },
          { n: '3', t: 'Both get rewarded', s: 'Get free featured job post credits' },
        ].map(step => (
          <View key={step.n} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{step.n}</Text></View>
            <View>
              <Text style={styles.stepTitle}>{step.t}</Text>
              <Text style={styles.stepSub}>{step.s}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#ebebeb', marginBottom: 16 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 8 },
  sub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  codeBox: { width: '100%', backgroundColor: '#fff7ed', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#fed7aa', marginBottom: 20, borderStyle: 'dashed' },
  codeLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 6 },
  code: { fontSize: 28, fontWeight: '900', color: ORANGE, letterSpacing: 4, marginBottom: 10 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },
  shareBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14 },
  shareTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  howCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#ebebeb' },
  howTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  stepSub: { fontSize: 12, color: '#888' },
});
