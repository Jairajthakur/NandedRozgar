import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar, Animated, Easing,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ORANGE = '#f97316';

const SLIDES = [
  { icon: 'briefcase', iconColor: ORANGE,     iconBg: '#fff3e8', title: 'Find Local Jobs',     titleMr: 'स्थानिक नोकऱ्या शोधा',       sub: 'Browse hundreds of jobs in Nanded — driver, security, shop assistant, and much more. All free.', subMr: 'नांदेडमधील शेकडो नोकऱ्या — चालक, सुरक्षा, दुकान सहाय्यक आणि बरेच काही. पूर्णपणे मोफत.' },
  { icon: 'business',  iconColor: '#6366f1',   iconBg: '#f0f4ff', title: 'Rooms, Cars & More', titleMr: 'खोल्या, गाड्या आणि बरेच काही', sub: 'Rent a room, hire a car, or buy & sell used items — all in one local app built for Nanded.',     subMr: 'खोली भाड्याने घ्या, कार भाड्याने द्या किंवा जुन्या वस्तू खरेदी-विक्री करा — नांदेडसाठी एकच ॲप.' },
  { icon: 'rocket',    iconColor: '#16a34a',   iconBg: '#f0fdf4', title: 'Post in Minutes',   titleMr: 'काही मिनिटांत पोस्ट करा',      sub: 'Employers post jobs for just ₹49. Boost listings to reach more people faster. AI-powered matching included.', subMr: 'नियोक्ते फक्त ₹49 मध्ये नोकऱ्या पोस्ट करतात. अधिक लोकांपर्यंत पोहोचण्यासाठी बूस्ट करा.' },
];

export const ONBOARDING_KEY = 'nr_onboarded_v1';
export async function markOnboarded() { try { await SecureStore.setItemAsync(ONBOARDING_KEY, '1'); } catch {} }
export async function isOnboarded() { try { const v = await SecureStore.getItemAsync(ONBOARDING_KEY); return v === '1'; } catch { return false; } }

// ── Animated slide content ────────────────────────────────────────────────────
function SlideContent({ slide, isMr, active }) {
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (active) {
      // Reset
      iconScale.setValue(0.5); iconOpacity.setValue(0); textOpacity.setValue(0); textY.setValue(20);
      // Animate in
      Animated.sequence([
        Animated.parallel([
          Animated.spring(iconScale,   { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 120 }),
          Animated.timing(iconOpacity, { toValue: 1,    duration: 280, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(textOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(textY,       { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [active]);

  // floating animation on icon
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, { toValue: -8,  duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatY, { toValue:  0,  duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      floatY.stopAnimation();
      floatY.setValue(0);
    }
  }, [active]);

  return (
    <View style={os.slide}>
      <Animated.View style={[os.iconCircle, { backgroundColor: slide.iconBg, opacity: iconOpacity, transform: [{ scale: iconScale }, { translateY: floatY }] }]}>
        <Ionicons name={slide.icon} size={52} color={slide.iconColor} />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
        <Text style={os.title}>{isMr ? slide.titleMr : slide.title}</Text>
        <Text style={os.sub}>{isMr ? slide.subMr : slide.sub}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState('en');
  const scrollRef = useRef(null);
  const isMr = lang === 'mr';

  // dot width animation
  const dotWidths = SLIDES.map((_, i) => useRef(new Animated.Value(i === 0 ? 24 : 8)).current);

  function goTo(idx) {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    // Animate dots
    SLIDES.forEach((_, i) => {
      Animated.timing(dotWidths[i], {
        toValue: i === idx ? 24 : 8, duration: 250, useNativeDriver: false,
      }).start();
    });
    setPage(idx);
  }

  function next() {
    if (page < SLIDES.length - 1) goTo(page + 1);
    else finish();
  }

  async function finish() { await markOnboarded(); onDone?.(); }

  // Button pulse on last slide
  const btnScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (page === SLIDES.length - 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(btnScale, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(btnScale, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      btnScale.setValue(1);
    }
  }, [page]);

  return (
    <View style={os.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Language toggle */}
      <View style={os.langRow}>
        {['en', 'mr'].map(code => (
          <TouchableOpacity key={code} style={[os.langBtn, lang === code && os.langActive]} onPress={() => setLang(code)}>
            <Text style={[os.langTxt, lang === code && os.langActiveTxt]}>{code === 'en' ? 'English' : 'मराठी'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Slides */}
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={false} style={{ flex: 1 }}>
        {SLIDES.map((slide, i) => (
          <SlideContent key={i} slide={slide} isMr={isMr} active={page === i} />
        ))}
      </ScrollView>

      {/* Animated dots */}
      <View style={os.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View key={i} style={[os.dot, { width: dotWidths[i], backgroundColor: i === page ? ORANGE : '#ddd' }]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={os.btnRow}>
        <TouchableOpacity style={os.skipBtn} onPress={finish}>
          <Text style={os.skipTxt}>{isMr ? 'वगळा' : 'Skip'}</Text>
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity style={os.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={os.nextTxt}>
              {page === SLIDES.length - 1 ? (isMr ? 'सुरू करा' : 'Get Started') : (isMr ? 'पुढे' : 'Next')}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text style={os.brand}><Text style={{ color: '#111' }}>Nanded</Text><Text style={{ color: ORANGE }}>Rozgar</Text></Text>
    </View>
  );
}

const os = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8, gap: 8 },
  langBtn: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#e5e5e5' },
  langActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  langTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  langActiveTxt: { color: '#fff' },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 20 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  title: { fontSize: 26, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 14, lineHeight: 32 },
  sub:   { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
  dots:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot:   { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  skipBtn: { padding: 12 },
  skipTxt: { fontSize: 14, color: '#999', fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  brand:  { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingBottom: 32, letterSpacing: 0.3 },
});
