import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#f97316';

const OPTIONS = [
  {
    icon: 'briefcase-outline',
    color: ORANGE,
    bg: '#fff7ed',
    title: 'Post a Job',
    sub: 'Hire staff, workers, delivery partners',
    screen: 'PostJob',
  },
  {
    icon: 'home-outline',
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'List a Room / PG',
    sub: 'Find tenants for your flat or hostel',
    screen: 'PostRoom',
  },
  {
    icon: 'car-outline',
    color: '#6366f1',
    bg: '#eef2ff',
    title: 'Rent your Vehicle',
    sub: 'List your car, bike or auto',
    screen: 'PostCar',
  },
  {
    icon: 'pricetag-outline',
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Sell an Item',
    sub: 'Sell electronics, furniture, books',
    screen: 'BuySell',
  },
];

export default function PostScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>What do you want to post?</Text>
        <Text style={styles.sub}>Reach 10,000+ people in Nanded today.</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.screen}
            style={styles.card}
            onPress={() => nav.navigate(opt.screen)}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: opt.bg }]}>
              <Ionicons name={opt.icon} size={24} color={opt.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{opt.title}</Text>
              <Text style={styles.cardSub}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub:   { fontSize: 13, color: '#aaa' },
  options: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 3 },
  cardSub:   { fontSize: 12, color: '#888' },
});
