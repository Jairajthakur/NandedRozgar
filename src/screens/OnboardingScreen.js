import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar, Animated,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import GeometricBg from '../components/GeometricBg';

const { width: W } = Dimensions.get('window');
const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

const SLIDES = [
  {
    icon: 'briefcase',
    accentColor: ORANGE,
    gradientStart: 'rgba(249,115,22,0.25)',
    title: 'Find Local Jobs',
    titleMr: 'स्थानिक नोकऱ्या शोधा',
    sub: 'Browse hundreds of jobs in Nanded — driver, security, shop assistant, and much more. All free.',
    subMr: 'नांदेडमधील शेकडो नोकऱ्या — चालक, सुरक्षा, दुकान सहाय्यक आणि बरेच काही. पूर्णपणे मोफत.',
  },
  {
    icon: 'business',
    accentColor: INDIGO,
    gradientStart: 'rgba(99,102,241,0.25)',
    title: 'Rooms, Cars & More',
    titleMr: 'खोल्या, गाड्या आणि बरेच काही',
    sub: 'Rent a room, hire a car, or buy & sell used items — all in one local app built for Nanded.',
    subMr: 'खोली भाड्याने घ्या, कार भाड्याने द्या — नांदेडसाठी एकच ॲप.',
  },
  {
    icon: 'rocket',
    accentColor: CYAN,
    gradientStart: 'rgba(34,211,238,0.25)',
    title: 'Post in Minutes',
    titleMr: 'काही मिनिटांत पोस्ट करा',
    sub: 'Employers post jobs for just ₹49. AI-powered matching included.',
    subMr: 'नियोक्ते फक्त ₹49 मध्ये नोकऱ्या पोस्ट करतात. AI मॅचिंग विनामूल्य.',
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

function SlideIllustration({ slide, active }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rot1 = useRef(new Animated.Value(0)).current;
  const rot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      Animated.loop(Animated.sequence([
        Animated.timing(rot1, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(rot1, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(rot2, { toValue: 1, duration: 5000, useNativeDriver: true }),
        Animated.timing(rot2, { toValue: 0, duration: 5000, useNativeDriver: true }),
      ])).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  const rotate1 = rot1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotate2 = rot2.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '405deg'] });

  return (
    <Animated.View style={[s.illustWrap, { opacity, transform: [{ scale }] }]}>
      {/* Outer ring */}
      <Animated.View style={[s.ring1, { borderColor: slide.accentColor + '22', transform: [{ rotate: rotate1 }] }]} />
      {/* Middle ring */}
      <Animated.View style={[s.ring2, { borderColor: slide.accentColor + '40', transform: [{ rotate: rotate2 }] }]} />
      {/* Floating diamonds */}
      <View style={[s.diamond1, { backgroundColor: slide.accentColor + '20', borderColor: slide.accentColor + '40' }]} />
      <View style={[s.diamond2, { backgroundColor: slide.accentColor + '15', borderColor: slide.accentColor + '30' }]} />
      {/* Floating triangle */}
      <View style={[s.tri, {
        borderBottomColor: slide.accentColor + '20',
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
      }]} />
      {/* Center icon */}
      <View style={[s.iconCircle, { backgroundColor: slide.gradientStart, borderColor: slide.accentColor + '60' }]}>
        <View style={[s.iconInner, { backgroundColor: slide.gradientStart }]}>
          <Ionicons name={slide.icon} size={46} color={slide.accentColor} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState('en');
  const scrollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isMr = lang === 'mr';
  const slide = SLIDES[page];

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (page + 1) / SLIDES.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [page]);

  function goTo(idx) {
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080812" />
      <GeometricBg />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.langRow}>
          {['en', 'mr'].map(l => (
            <TouchableOpacity key={l} style={[s.langBtn, lang === l && s.langActive]} onPress={() => setLang(l)}>
              <Text style={[s.langTxt, lang === l && s.langActiveTxt]}>{l === 'en' ? 'English' : 'मराठी'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={finish} style={s.skipBtn}>
          <Text style={s.skipTxt}>{isMr ? 'वगळा' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressBg}>
        <Animated.View style={[s.progressFill, { width: progressWidth, backgroundColor: slide.accentColor }]} />
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((sl, i) => (
          <View key={i} style={s.slide}>
            <SlideIllustration slide={sl} active={i === page} />

            {/* Step badge */}
            <View style={[s.stepBadge, { borderColor: sl.accentColor + '50', backgroundColor: sl.accentColor + '15' }]}>
              <Text style={[s.stepTxt, { color: sl.accentColor }]}>{i + 1} / {SLIDES.length}</Text>
            </View>

            <Text style={s.title}>{isMr ? sl.titleMr : sl.title}</Text>
            <Text style={s.sub}>{isMr ? sl.subMr : sl.sub}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        {SLIDES.map((sl, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[s.dot,
              i === page && { width: 28, backgroundColor: slide.accentColor },
              i !== page && { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Next button */}
      <View style={s.btnArea}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: slide.accentColor, shadowColor: slide.accentColor }]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={s.nextTxt}>
            {page === SLIDES.length - 1 ? (isMr ? 'सुरू करा' : 'Get Started') : (isMr ? 'पुढे' : 'Continue')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={s.brand}>
        <Text style={{ color: '#fff' }}>Nanded</Text>
        <Text style={{ color: ORANGE }}>Rozgar</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  langActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  langTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  langActiveTxt: { color: '#fff' },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  skipTxt: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 3, borderRadius: 2 },
  slide: { width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  illustWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring1: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderStyle: 'dashed' },
  ring2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2 },
  diamond1: { position: 'absolute', width: 22, height: 22, transform: [{ rotate: '45deg' }], top: 10, right: 24, borderWidth: 1 },
  diamond2: { position: 'absolute', width: 14, height: 14, transform: [{ rotate: '45deg' }], bottom: 20, left: 18, borderWidth: 1 },
  tri: { position: 'absolute', top: 16, left: 20, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  iconCircle: { width: 112, height: 112, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  iconInner: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  stepTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 14, lineHeight: 36, letterSpacing: 0.3 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 25 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  btnArea: { paddingHorizontal: 24, marginBottom: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  nextTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  brand: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingBottom: 32, letterSpacing: 0.5, color: 'rgba(255,255,255,0.3)' },
});
