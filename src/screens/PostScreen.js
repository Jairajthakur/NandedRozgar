import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ORANGE = '#f97316';

const OPTIONS = [
  { icon: '💼', label: 'Post a Job',        sub: 'Hire for your business',  color: '#fff8f3', border: '#fde8d5', route: 'PostJob'  },
  { icon: '🏢', label: 'Post a Room / PG',  sub: 'List your property',      color: '#f3f8ff', border: '#d5e8fd', route: 'PostRoom' },
  { icon: '🚗', label: 'Post a Car / Vehicle', sub: 'Rent out your vehicle', color: '#f3fff6', border: '#d5fde4', route: 'PostCar'  },
  { icon: '🏷️', label: 'Buy & Sell',         sub: 'New or used items',       color: '#fdf3ff', border: '#ead5fd', route: 'BuySell' },
];

export default function PostScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={styles.header}>
        <Text style={styles.heading}>📢 What do you want to post?</Text>
        <Text style={styles.subheading}>Choose a category to get started</Text>
      </View>
      <View style={styles.grid}>
        {OPTIONS.map(opt => (
          <TouchableOpacity key={opt.route}
            style={[styles.card, { backgroundColor: opt.color, borderColor: opt.border }]}
            onPress={() => navigation.navigate(opt.route)} activeOpacity={0.75}>
            <Text style={styles.cardIcon}>{opt.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardSub}>{opt.sub}</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { backgroundColor: '#111', paddingTop: 24, paddingBottom: 28, paddingHorizontal: 20 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  subheading: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 },
  grid: { padding: 16, gap: 12, flex: 1, justifyContent: 'center' },
  card: { borderRadius: 16, borderWidth: 1.5, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardIcon: { fontSize: 30, width: 42, textAlign: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#888' },
  arrowWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
