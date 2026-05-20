import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../utils/constants';
import { useLang } from '../utils/i18n';

const PURPLE = '#9333ea';
const CATEGORY_ICONS = {
  Electronics: 'phone-portrait',
  Furniture:   'home',
  Vehicles:    'bicycle',
  Clothes:     'shirt',
  Books:       'book',
  Other:       'pricetag',
};

const CATEGORY_COLORS = {
  Electronics: { bg: '#f3e8ff', icon: '#9333ea' },
  Furniture:   { bg: '#fef9c3', icon: '#ca8a04' },
  Vehicles:    { bg: '#dcfce7', icon: '#16a34a' },
  Clothes:     { bg: '#fee2e2', icon: '#dc2626' },
  Books:       { bg: '#dbeafe', icon: '#2563eb' },
  Other:       { bg: '#f3f4f6', icon: '#555' },
};

const CONDITION_COLORS = {
  'Like new': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Good':     { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  'Used':     { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
};

export default function BuySellDetailScreen() {
  const nav   = useNavigation();
  const route = useRoute();
  const item  = route.params?.item;
  const { t } = useLang();
  const [saved, setSaved] = useState(false);

  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted }}>Item not found</Text>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[item.cat] || CATEGORY_COLORS.Other;
  const condStyle = CONDITION_COLORS[item.condition] || CONDITION_COLORS['Used'];

  function openWhatsApp() {
    const msg = `Hi, I'm interested in your "${item.title}" listed on NandedRozgar for ${item.price}.`;
    Linking.openURL(`https://wa.me/91${item.phone || 'XXXXXXXXXX'}?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please contact via call.')
    );
  }

  async function shareItem() {
    try {
      await Share.share({
        message: `${item.emoji || '📦'} ${item.title} — ${item.price}\n📍 ${item.loc}\nCondition: ${item.condition}\n\nSee it on NandedRozgar!`,
        title: `${item.title} — NandedRozgar`,
      });
    } catch (_) {}
  }

  return (
    <View style={s.container}>
      {/* Gallery / Hero */}
      <View style={[s.hero, { backgroundColor: catColor.bg }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#333" />
        </TouchableOpacity>

        <View style={s.heroIconWrap}>
          <Text style={s.heroEmoji}>{item.emoji || '📦'}</Text>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => setSaved(v => !v)}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? PURPLE : '#555'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Title + Price */}
        <View style={s.titleSection}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{item.title}</Text>
            <View style={s.metaRow}>
              <View style={[s.catBadge, { backgroundColor: catColor.bg }]}>
                <Ionicons name={CATEGORY_ICONS[item.cat] || 'pricetag'} size={11} color={catColor.icon} />
                <Text style={[s.catTxt, { color: catColor.icon }]}>{item.cat}</Text>
              </View>
              <View style={[s.condBadge, { backgroundColor: condStyle.bg, borderColor: condStyle.border }]}>
                <Text style={[s.condTxt, { color: condStyle.text }]}>{item.condition}</Text>
              </View>
            </View>
          </View>
          <Text style={s.price}>{item.price}</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Ionicons name="location-sharp" size={14} color="#9333ea" />
            <Text style={s.statTxt}>{item.loc}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Ionicons name="time-outline" size={14} color="#9333ea" />
            <Text style={s.statTxt}>{item.time}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Ionicons name="eye-outline" size={14} color="#9333ea" />
            <Text style={s.statTxt}>{item.views || '—'} views</Text>
          </View>
        </View>

        {/* Description */}
        <View style={s.card}>
          <Text style={s.sectionHead}>ABOUT THIS ITEM</Text>
          <Text style={s.desc}>
            {item.description ||
              `This ${item.title} is listed in ${item.condition} condition. Located in ${item.loc}. Contact the seller for more details or to negotiate the price.`}
          </Text>
        </View>

        {/* Details grid */}
        {(item.brand || item.age || item.warranty || item.negotiable !== undefined) && (
          <View style={s.card}>
            <Text style={s.sectionHead}>DETAILS</Text>
            <View style={s.detailGrid}>
              {item.brand && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Brand</Text>
                  <Text style={s.detailVal}>{item.brand}</Text>
                </View>
              )}
              {item.age && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Age</Text>
                  <Text style={s.detailVal}>{item.age}</Text>
                </View>
              )}
              {item.warranty && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Warranty</Text>
                  <Text style={s.detailVal}>{item.warranty}</Text>
                </View>
              )}
              {item.negotiable !== undefined && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Price</Text>
                  <Text style={s.detailVal}>{item.negotiable ? 'Negotiable' : 'Fixed'}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Seller */}
        <View style={s.card}>
          <Text style={s.sectionHead}>SELLER</Text>
          <View style={s.sellerRow}>
            <View style={s.sellerAvatar}>
              <Text style={s.sellerInitial}>
                {(item.sellerName || 'S')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sellerName}>{item.sellerName || 'Seller'}</Text>
              <Text style={s.sellerSub}>{item.loc} · {item.time}</Text>
            </View>
            {item.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
                <Text style={s.verifiedTxt}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Share */}
        <TouchableOpacity style={s.shareBtn} onPress={shareItem}>
          <Ionicons name="share-social-outline" size={15} color="#555" />
          <Text style={s.shareTxt}>Share this listing</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CTA Bar */}
      <View style={s.ctaBar}>
        <TouchableOpacity
          style={s.ctaMain}
          onPress={() => Alert.alert('Contact Seller', item.phone ? `Call: ${item.phone}` : 'Contact info not available.')}
        >
          <Ionicons name="call" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={s.ctaMainTxt}>Contact Seller</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaIcon} onPress={openWhatsApp}>
          <Text style={{ fontSize: 20 }}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaIcon} onPress={() => { setSaved(v => !v); Alert.alert(saved ? 'Removed' : 'Saved', saved ? 'Removed from saved.' : 'Added to saved listings.'); }}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? PURPLE : '#555'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  hero: {
    height: 220, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute', top: 44, left: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  saveBtn: {
    position: 'absolute', top: 44, right: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  heroIconWrap: {
    width: 100, height: 100, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 52 },

  body: { flex: 1 },

  titleSection: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20,
  },
  catTxt: { fontSize: 11, fontWeight: '600' },
  condBadge: {
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 9,
  },
  condTxt: { fontSize: 11, fontWeight: '700' },
  price: { fontSize: 22, fontWeight: '900', color: '#9333ea', marginLeft: 8 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginTop: 8,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  statTxt: { fontSize: 12, color: '#555', fontWeight: '500' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e5e5e5' },

  card: {
    backgroundColor: '#fff', marginTop: 8,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sectionHead: {
    fontSize: 10, fontWeight: '700', color: '#aaa',
    letterSpacing: 0.8, marginBottom: 10,
  },
  desc: { fontSize: 14, lineHeight: 22, color: '#333' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 10, width: '47%',
  },
  detailLabel: { fontSize: 10, color: '#aaa', marginBottom: 3 },
  detailVal: { fontSize: 13, fontWeight: '700', color: '#111' },

  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sellerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { fontSize: 16, fontWeight: '800', color: '#9333ea' },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#111' },
  sellerSub: { fontSize: 11, color: '#aaa', marginTop: 1 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8,
  },
  verifiedTxt: { fontSize: 10, fontWeight: '700', color: '#16a34a' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', paddingVertical: 14, marginTop: 8,
  },
  shareTxt: { fontSize: 13, color: '#555', fontWeight: '600' },

  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  ctaMain: {
    flex: 1, backgroundColor: '#9333ea', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaMainTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ctaIcon: {
    backgroundColor: '#f0f0f0', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
});
