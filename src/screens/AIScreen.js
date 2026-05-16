import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Card, Btn } from '../components/UI';
import { BASE_URL } from '../utils/constants';
import { getToken } from '../utils/api';
import { useLang } from '../utils/i18n';
import GeometricBg from '../components/GeometricBg';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';
const PURPLE = '#8b5cf6';

function PulsingDot({ color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true, delay }),
      Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: anim }} />;
}

function HintCard({ text, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={hi.card} activeOpacity={0.85}>
      <View style={hi.icon}>
        <Ionicons name="bulb-outline" size={13} color={ORANGE} />
      </View>
      <Text style={hi.text}>{text}</Text>
      <Ionicons name="arrow-forward-circle-outline" size={16} color={ORANGE + '60'} />
    </TouchableOpacity>
  );
}

export default function AIScreen() {
  const { user, role, jobs } = useAuth();
  const { t } = useLang();
  const [query, setQuery]       = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading]   = useState(false);
  const pulseAnim               = useRef(new Animated.Value(1)).current;
  const fadeAnim                = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [loading]);

  useEffect(() => {
    if (response) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [response]);

  const hints = [
    'What salary should I offer for a driver role in Nanded?',
    'Write a job description for a security guard',
    'How many applications for ₹12,000/month?',
    'Best way to hire quickly in Nanded?',
  ];

  async function askAI() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ query, role, userLocation: user?.location }),
      });
      const data = await res.json();
      setResponse(data.ok ? data.reply : (data.error || 'Sorry, AI is not available right now.'));
    } catch {
      setResponse('Error connecting to AI. Please check your connection.');
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>

      {/* ── AI Hero Banner ── */}
      <View style={s.hero}>
        <GeometricBg />
        <View style={s.heroShine} />
        {/* Floating shapes */}
        <View style={[s.hGeo1, { borderBottomColor: CYAN + '18' }]} />
        <View style={[s.hGeo2, { backgroundColor: PURPLE + '12', borderColor: PURPLE + '20' }]} />

        <Animated.View style={[s.aiIconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={s.aiIconRing} />
          <View style={s.aiIconInner}>
            <Ionicons name="sparkles" size={28} color={ORANGE} />
          </View>
        </Animated.View>
        <Text style={s.heroTitle}>{t('aiAssistant')}</Text>
        <Text style={s.heroSub}>
          {`Get hiring insights and salary benchmarks for Nanded`}
        </Text>

        {/* Context strip */}
        <View style={s.contextStrip}>
          <Ionicons name="briefcase-outline" size={12} color={CYAN} />
          <Text style={s.contextTxt}>
            <Text style={{ color: CYAN, fontWeight: '700' }}>{jobs.filter(j => j.status === 'active').length}</Text>
            {' active jobs in Nanded'}
          </Text>
        </View>
      </View>

      {/* ── Hints ── */}
      <Text style={s.sectionLabel}>Suggested Questions</Text>
      {hints.map(q => (
        <HintCard key={q} text={q} onPress={() => setQuery(q)} />
      ))}

      {/* ── Input Area ── */}
      <View style={s.inputCard}>
        <View style={s.inputCardShine} />
        <Text style={s.inputLabel}>Ask Anything</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder={t('askAnything') || 'Type your question…'}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={query}
            onChangeText={setQuery}
            multiline
            textAlignVertical="top"
          />
        </View>

        {loading ? (
          <View style={s.thinkingRow}>
            <PulsingDot color={ORANGE} delay={0} />
            <PulsingDot color={CYAN} delay={200} />
            <PulsingDot color={PURPLE} delay={400} />
            <Text style={s.thinkingTxt}>AI is thinking…</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.sendBtn, (!query.trim()) && s.sendBtnDisabled]}
            onPress={askAI}
            disabled={!query.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={s.sendBtnTxt}>{t('send') || 'Send'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Response ── */}
      {!!response && (
        <Animated.View style={[s.responseCard, { opacity: fadeAnim }]}>
          <View style={s.responseShine} />
          {/* Geo decorations */}
          <View style={[s.respGeo1, { borderBottomColor: CYAN + '14' }]} />
          <View style={[s.respGeo2, { backgroundColor: ORANGE + '08', borderColor: ORANGE + '15' }]} />
          <View style={s.responseHeader}>
            <View style={s.responseIconWrap}>
              <Ionicons name="sparkles" size={14} color={ORANGE} />
            </View>
            <Text style={s.responseHeaderTxt}>AI Response</Text>
            <View style={s.responseLiveDot} />
          </View>
          <Text style={s.responseText}>{response}</Text>
        </Animated.View>
      )}

    </ScrollView>
  );
}

const hi = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 13, marginBottom: 8,
  },
  icon: { width: 28, height: 28, borderRadius: 8, backgroundColor: ORANGE + '15', borderWidth: 1, borderColor: ORANGE + '25', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500', lineHeight: 18 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080812' },

  hero: { borderRadius: 20, padding: 22, marginBottom: 18, alignItems: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroShine: { position: 'absolute', top: 0, left: 40, right: 40, height: 1, backgroundColor: ORANGE + '30' },
  hGeo1: { position: 'absolute', top: -4, right: 24, width: 0, height: 0, borderLeftWidth: 28, borderRightWidth: 28, borderBottomWidth: 48, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  hGeo2: { position: 'absolute', bottom: 10, left: 16, width: 22, height: 22, borderRadius: 4, borderWidth: 1, transform: [{ rotate: '45deg' }] },

  aiIconWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  aiIconRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: ORANGE + '35', backgroundColor: 'transparent' },
  aiIconInner: { width: 60, height: 60, borderRadius: 20, backgroundColor: ORANGE + '18', borderWidth: 1.5, borderColor: ORANGE + '50', alignItems: 'center', justifyContent: 'center', shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6, letterSpacing: 0.3 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
  contextStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: CYAN + '10', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: CYAN + '25' },
  contextTxt: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },

  inputCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 14, overflow: 'hidden' },
  inputCardShine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  inputWrap: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 14 },
  input: { padding: 14, fontSize: 14, color: '#fff', minHeight: 90, lineHeight: 22 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14 },
  thinkingTxt: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  sendBtnDisabled: { opacity: 0.35, shadowOpacity: 0 },
  sendBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  responseCard: { borderRadius: 16, borderWidth: 1.5, borderColor: ORANGE + '30', backgroundColor: ORANGE + '06', padding: 18, overflow: 'hidden' },
  responseShine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: ORANGE + '50' },
  respGeo1: { position: 'absolute', bottom: 8, right: 16, width: 0, height: 0, borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 34, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  respGeo2: { position: 'absolute', top: 8, right: 60, width: 16, height: 16, borderRadius: 3, borderWidth: 1, transform: [{ rotate: '45deg' }] },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  responseIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: ORANGE + '20', borderWidth: 1, borderColor: ORANGE + '40', alignItems: 'center', justifyContent: 'center' },
  responseHeaderTxt: { fontSize: 12, fontWeight: '700', color: ORANGE, flex: 1, letterSpacing: 0.5 },
  responseLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.8, shadowRadius: 4 },
  responseText: { fontSize: 14, lineHeight: 24, color: 'rgba(255,255,255,0.8)' },
});
