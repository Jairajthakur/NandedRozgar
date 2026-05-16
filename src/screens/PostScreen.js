import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';

// ── Individual animated option card ──────────────────────────────────────────
function OptionCard({ opt, index }) {
  const nav = useNavigation();
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-40)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay: 80 + index * 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 380, delay: 80 + index * 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
    ]).start(() => nav.navigate(opt.route));
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
      <TouchableOpacity
        style={[s.card, { backgroundColor: opt.color, borderColor: opt.border }]}
        onPress={press} activeOpacity={1}
      >
        <View style={[s.iconWrap, { backgroundColor: opt.border }]}>
          <Ionicons name={opt.iconName} size={26} color={opt.iconColor} />
        </View>
        <View style={s.cardText}>
          <Text style={s.cardLabel}>{opt.label}</Text>
          <Text style={s.cardSub}>{opt.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#bbb" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PostScreen() {
  const { t } = useLang();

  // Header animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY       = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const OPTIONS = [
    { iconName: 'briefcase',  label: t('postAJob'),           sub: 'Hire for your business',   color: '#fff8f3', border: '#fde8d5', iconColor: ORANGE,    route: 'PostJob'  },
    { iconName: 'business',   label: t('postRoom') + ' / PG', sub: 'List your property',       color: '#f3f8ff', border: '#d5e8fd', iconColor: '#3b82f6', route: 'PostRoom' },
    { iconName: 'car-sport',  label: t('postCar') + ' / Vehicle', sub: 'Rent out your vehicle',color: '#f3fff6', border: '#d5fde4', iconColor: '#16a34a', route: 'PostCar'  },
    { iconName: 'pricetag',   label: t('buySell'),             sub: 'New or used items',       color: '#fdf3ff', border: '#ead5fd', iconColor: '#9333ea', route: 'BuySell'  },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.View style={[s.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
        <Text style={s.headerTitle}>What would you like to post?</Text>
        <Text style={s.headerSub}>Reach 10,000+ people in Nanded today.</Text>
      </Animated.View>
      <ScrollView contentContainerStyle={s.list}>
        {OPTIONS.map((opt, i) => <OptionCard key={opt.route} opt={opt} index={i} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#111', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#888', fontSize: 13, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  iconWrap: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
});
