import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';

const CATEGORIES = [
  { key: 'All', label: 'All 🔷' },
  { key: 'Electronics', label: 'Electronics', icon: 'phone-portrait' },
  { key: 'Furniture', label: '🪑 Furniture' },
  { key: 'Vehicles', label: '🛵 Vehicles' },
  { key: 'Clothes', label: 'Clothes' },
  { key: 'Books', label: '📚 Books' },
  { key: 'Other', label: '📦 Other' },
];

export const SAMPLE_ITEMS = [
  { id: 1, title: 'Samsung TV 42"', price: '₹8,500', cat: 'Electronics', loc: 'Cidco', time: '2h ago', emoji: '📺', condition: 'Good' },
  { id: 2, title: 'Wooden Study Table', price: '₹2,200', cat: 'Furniture', loc: 'Vazirabad', time: '5h ago', emoji: '🪑', condition: 'Like new' },
  { id: 3, title: 'Honda Activa 2019', price: '₹45,000', cat: 'Vehicles', loc: 'Station Road', time: '1d ago', emoji: '🛵', condition: 'Good' },
  { id: 4, title: 'Engineering Books Set', price: '₹600', cat: 'Books', loc: 'SRTMU Area', time: '3h ago', emoji: '📚', condition: 'Used' },
  { id: 5, title: 'Refrigerator 200L', price: '₹6,000', cat: 'Electronics', loc: 'Shivaji Nagar', time: '6h ago', emoji: '🧊', condition: 'Good' },
  { id: 6, title: 'Single Bed with Mattress', price: '₹3,500', cat: 'Furniture', loc: 'Cidco', time: '2d ago', emoji: '🛏️', condition: 'Used' },
];

export default function BuySellScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_ITEMS.filter(item => {
    const matchCat = activeCat === 'All' || item.cat === activeCat;
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color="#aaa" style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search items…"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {CATEGORIES.map(({ key, label }) => (
          <TouchableOpacity key={key} onPress={() => setActiveCat(key)}
            style={[s.chip, activeCat === key && s.chipActive]}>
            <Text style={[s.chipTxt, activeCat === key && s.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items list */}
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
        <View style={s.grid}>
          {filtered.map(item => (
            <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.85}>
              <View style={s.cardImg}>
                <Ionicons name="pricetag" size={36} color="#9333ea" />
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.cardPrice}>{item.price}</Text>
                <View style={s.cardMeta}>
                  <View style={s.condBadge}>
                    <Text style={s.condTxt}>{item.condition}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="location-sharp" size={11} color="#aaa" /><Text style={s.cardLoc}> {item.loc} · {item.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="pricetag" size={36} color="#9333ea" style={{ marginBottom: 10 }} />
            <Text style={s.emptyTxt}>No items found</Text>
            <Text style={s.emptySub}>Try a different category or search</Text>
          </View>
        )}
      </ScrollView>

      {/* Sell button */}
      <TouchableOpacity style={s.sellBtn} activeOpacity={0.9}>
        <Text style={s.sellBtnTxt}>{t('sellItem')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e0e0e0',
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#111' },

  chips: { paddingHorizontal: 12, paddingBottom: 10, gap: 7 },
  chip:  { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e5e5e5', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 13 },
  chipActive:    { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipTxt:       { fontSize: 12, fontWeight: '500', color: '#555' },
  chipTxtActive: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 13, borderWidth: 0.5, borderColor: '#ebebeb', overflow: 'hidden' },
  cardImg:   { height: 90, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
  cardBody:  { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#f97316', marginBottom: 5 },
  cardMeta:  { flexDirection: 'row', marginBottom: 5 },
  condBadge: { backgroundColor: '#f0fdf4', borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  condTxt:   { fontSize: 9, fontWeight: '600', color: '#15803d' },
  cardLoc:   { fontSize: 10, color: '#999' },

  empty:    { alignItems: 'center', paddingTop: 60 },
  emptyTxt: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#999' },

  sellBtn: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#f97316', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  sellBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
