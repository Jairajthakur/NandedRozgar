import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { C } from '../utils/constants';

const PHOTO_LABELS = { room: 'Room', kitchen: 'Kitchen', bath: 'Bath', view: 'View', hall: 'Hall', bedroom: 'Bedroom' };

export default function RoomCard({ room: r, onPress }) {
  const photos = r.photos || {};
  const photoKeys = Object.keys(photos).filter(k => photos[k]);
  const [activeTab, setActiveTab] = useState(photoKeys[0] || 'room');

  const activePhoto = photos[activeTab];
  const isAvailable = r.available !== false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Photo gallery */}
      {photoKeys.length > 0 && (
        <View style={styles.galleryWrap}>
          <View style={styles.photoCount}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
              {photoKeys.length} photo{photoKeys.length > 1 ? 's' : ''}
            </Text>
          </View>
          {isAvailable && (
            <View style={styles.availBadge}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Available</Text>
            </View>
          )}
          {activePhoto ? (
            <Image
              source={{ uri: activePhoto }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Text style={{ fontSize: 36 }}>🏠</Text>
            </View>
          )}
          {/* Photo tabs */}
          {photoKeys.length > 1 && (
            <View style={styles.tabs}>
              {photoKeys.map(k => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setActiveTab(k)}
                  style={[styles.tab, activeTab === k && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === k && styles.tabTextActive]}>
                    {PHOTO_LABELS[k] || k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{r.title}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {[r.occupancy, r.meals ? 'Meals included' : null, r.wifi ? 'WiFi' : null]
              .filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.chips}>
            {r.area && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>📍 {r.area}</Text>
              </View>
            )}
            {r.gender && (
              <View style={[styles.chip, { backgroundColor: '#f0f0f0' }]}>
                <Text style={styles.chipText}>{r.gender}</Text>
              </View>
            )}
          </View>
        </View>
        {r.rent && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{r.rent}/mo</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    marginBottom: 14, overflow: 'hidden',
  },
  galleryWrap: { position: 'relative' },
  photoCount: {
    position: 'absolute', top: 10, left: 10, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20,
  },
  availBadge: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    backgroundColor: '#22c55e',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20,
  },
  photo:   { width: '100%', height: 190, backgroundColor: '#1a2035' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  tabs: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tab: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: '#fff' },
  tabText:       { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  info: { flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  title:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  sub:      { fontSize: 12, color: C.muted, marginBottom: 6 },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { backgroundColor: '#f0f0f0', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 },
  chipText: { fontSize: 11, fontWeight: '600', color: C.text },
  priceBadge: {
    backgroundColor: C.dark, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 11, alignSelf: 'flex-start', marginLeft: 8,
  },
  priceText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
