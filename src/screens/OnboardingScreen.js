// ── OnboardingScreen.js ───────────────────────────────────────────────────────
// 3-slide intro shown to first-time users before Login.
// Saved flag via SecureStore so it only shows once.

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ORANGE = '#f97316';

const SLIDES = [
  {
    icon: 'briefcase',
    iconColor: ORANGE,
    iconBg: '#fff3e8',
    title: 'Find Local Jobs',
    titleMr: 'स्थानिक नोकऱ्या शोधा',
    sub: 'Browse hundreds of jobs in Nanded — driver, security, shop assistant, and much more. All free.',
    subMr: 'नांदेडमधील शेकडो नोकऱ्या — चालक, सुरक्षा, दुकान सहाय्यक आणि बरेच काही. पूर्णपणे मोफत.',
  },
  {
    icon: 'business',
    iconColor: '#6366f1',
    iconBg: '#f0f4ff',
    title: 'Rooms, Cars & More',
    titleMr: 'खोल्या, गाड्या आणि बरेच काही',
    sub: 'Rent a room, hire a car, or buy & sell used items — all in one local app built for Nanded.',
    subMr: 'खोली भाड्याने घ्या, कार भाड्याने द्या किंवा जुन्या वस्तू खरेदी-विक्री करा — नांदेडसाठी एकच ॲप.',
  },
  {
    icon: 'rocket',
    iconColor: '#16a34a',
    iconBg: '#f0fdf4',
    title: 'Post in Minutes',
    titleMr: 'काही मिनिटांत पोस्ट करा',
    sub: 'Employers post jobs for just ₹49. Boost listings to reach more people faster. AI-powered matching included.',
    subMr: 'नियोक्ते फक्त ₹49 मध्ये नोकऱ्या पोस्ट करतात. अधिक लोकांपर्यंत पोहोचण्यासाठी बूस्ट करा. AI मॅचिंग विनामूल्य.',
  },
];

export const ONBOARDING_KEY = 'nr_onboarded_v1';

export async function markOnboarded() {
  try { await SecureStore.setItemAsync(ONBOARDING_KEY, '1'); } catch {}
}

export async function isOnboarded() {
  try {
    const v = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return v === '1';
  } catch { return false; }
}

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState('en'); // 'en' or 'mr'
  const scrollRef = useRef(null);

  const isMr = lang === 'mr';

  function goTo(idx) {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setPage(idx);
  }

  function next() {
    if (page < SLIDES.length - 1) goTo(page + 1);
    else finish();
  }

  async function finish() {
    await markOnboarded();
    onDone?.();
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Language toggle */}
      <View style={s.langRow}>
        <TouchableOpacity
          style={[s.langBtn, lang === 'en' && s.langActive]}
          onPress={() => setLang('en')}
        >
          <Text style={[s.langTxt, lang === 'en' && s.langActiveTxt]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.langBtn, lang === 'mr' && s.langActive]}
          onPress={() => setLang('mr')}
        >
          <Text style={[s.langTxt, lang === 'mr' && s.langActiveTxt]}>मराठी</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={s.slide}>
            <View style={[s.iconCircle, { backgroundColor: slide.iconBg }]}>
              <Ionicons name={slide.icon} size={52} color={slide.iconColor} />
            </View>
            <Text style={s.title}>{isMr ? slide.titleMr : slide.title}</Text>
            <Text style={s.sub}>{isMr ? slide.subMr : slide.sub}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === page && s.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.skipBtn} onPress={finish}>
          <Text style={s.skipTxt}>{isMr ? 'वगळा' : 'Skip'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={next}>
          <Text style={s.nextTxt}>
            {page === SLIDES.length - 1
              ? (isMr ? 'सुरू करा' : 'Get Started')
              : (isMr ? 'पुढे' : 'Next')}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Branding */}
      <Text style={s.brand}>
        <Text style={{ color: '#111' }}>Nanded</Text>
        <Text style={{ color: ORANGE }}>Rozgar</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 8,
    gap: 8,
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  langActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  langTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  langActiveTxt: { color: '#fff' },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 32,
  },
  sub: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { width: 24, backgroundColor: ORANGE },

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  skipBtn: { padding: 12 },
  skipTxt: { fontSize: 14, color: '#999', fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  nextTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  brand: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingBottom: 32, letterSpacing: 0.3 },
});
