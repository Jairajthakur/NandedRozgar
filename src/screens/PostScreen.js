import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';

export default function PostScreen() {
  const nav = useNavigation();
  const { t } = useLang();

  const OPTIONS = [
    { iconName: 'briefcase',   lib: 'ion', label: t('postAJob'),        sub: 'Hire for your business',   color: '#fff8f3', border: '#fde8d5', iconColor: ORANGE,    route: 'PostJob'  },
    { iconName: 'business',    lib: 'ion', label: t('postRoom') + ' / PG', sub: 'List your property',    color: '#f3f8ff', border: '#d5e8fd', iconColor: '#3b82f6', route: 'PostRoom' },
    { iconName: 'car-sport',   lib: 'ion', label: t('postCar') + ' / Vehicle', sub: 'Rent out your vehicle', color: '#f3fff6', border: '#d5fde4', iconColor: '#16a34a', route: 'PostCar'  },
    { iconName: 'pricetag',    lib: 'ion', label: t('buySell'),          sub: 'New or used items',       color: '#fdf3ff', border: '#ead5fd', iconColor: '#9333ea', route: 'BuySell'  },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>What would you like to post?</Text>
        <Text style={s.headerSub}>Choose a category below</Text>
      </View>
      <ScrollView contentContainerStyle={s.list}>
        {OPTIONS.map(opt => (
          <TouchableOpacity key={opt.route} style={[s.card, { backgroundColor: opt.color, borderColor: opt.border }]}
            onPress={() => nav.navigate(opt.route)} activeOpacity={0.85}>
            <View style={[s.iconWrap, { backgroundColor: opt.border }]}>
              <Ionicons name={opt.iconName} size={26} color={opt.iconColor} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardLabel}>{opt.label}</Text>
              <Text style={s.cardSub}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>
        ))}
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
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1.5, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  iconWrap: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
});
