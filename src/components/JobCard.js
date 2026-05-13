import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, CAT_ICONS } from '../utils/constants';
import { timeAgo } from '../utils/api';

const ORANGE = '#f97316';

export default function JobCard({ job, onPress }) {
  const iconName = CAT_ICONS[job.category] || 'briefcase';

  // Freshness: green if < 24h, orange if < 7 days, gray otherwise
  const ageDays = (Date.now() - (job.timestamp || 0)) / 86400000;
  const freshnessColor = ageDays < 1 ? '#16a34a' : ageDays < 7 ? ORANGE : '#bbb';
  const freshnessLabel = ageDays < 1 ? 'Today' : ageDays < 7 ? `${Math.floor(ageDays)}d ago` : timeAgo(job.timestamp);

  async function shareJob(e) {
    e.stopPropagation?.();
    try {
      await Share.share({
        message: `🔥 Job Opening: ${job.title} at ${job.company}\n📍 ${job.location} | 💰 ${job.salary}\n\nApply on NandedRozgar!`,
      });
    } catch {}
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        job.featured && styles.featured,
        job.urgent   && styles.urgent,
      ]}
      activeOpacity={0.85}
    >
      {job.featured && (
        <View style={styles.featBadge}>
          <Ionicons name="star" size={9} color="#fff" style={{ marginRight: 3 }} />
          <Text style={styles.badgeText}>FEATURED</Text>
        </View>
      )}
      {job.urgent && !job.featured && (
        <View style={[styles.featBadge, { backgroundColor: '#ef4444' }]}>
          <Ionicons name="flame" size={9} color="#fff" style={{ marginRight: 3 }} />
          <Text style={styles.badgeText}>URGENT</Text>
        </View>
      )}

      <View style={[styles.row, (job.featured || job.urgent) && { marginTop: 12 }]}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={22} color={ORANGE} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
            {job.verified_employer && (
              <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
            )}
          </View>
          <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
          <View style={styles.chips}>
            <Chip iconName="location-sharp">  {job.location}</Chip>
            <Chip variant="orange" iconName="cash">  {job.salary}</Chip>
            <Chip variant="gray">{job.type}</Chip>
          </View>
        </View>
        <View style={styles.meta}>
          {/* Freshness indicator */}
          <View style={[styles.freshnessRow]}>
            <View style={[styles.freshnessDot, { backgroundColor: freshnessColor }]} />
            <Text style={[styles.metaTime, { color: freshnessColor }]}>{freshnessLabel}</Text>
          </View>
          {job.views > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="eye" size={10} color="#aaa" />
              <Text style={styles.metaText}> {job.views}</Text>
            </View>
          )}
          {job.applicant_count > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="person" size={10} color={ORANGE} />
              <Text style={[styles.metaText, { color: ORANGE, fontWeight: '700' }]}> {job.applicant_count}</Text>
            </View>
          )}
          {/* WhatsApp Share */}
          <TouchableOpacity onPress={shareJob} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={13} color="#aaa" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ children, variant, iconName }) {
  const bg    = variant === 'orange' ? '#fff7ed' : variant === 'gray' ? '#f0f0f0' : '#f5f5f5';
  const color = variant === 'orange' ? ORANGE : '#555';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 20, paddingVertical: 3,
      paddingHorizontal: 9, marginRight: 5, marginTop: 5 }}>
      {iconName && <Ionicons name={iconName} size={10} color={color} />}
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
    padding: 14,
    marginBottom: 8,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.03,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  featured: { borderColor: '#f97316', borderLeftWidth: 3 },
  urgent:   { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  featBadge: {
    position: 'absolute', top: 0, right: 14,
    backgroundColor: '#f97316',
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    paddingVertical: 2, paddingHorizontal: 9, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111' },
  company: { fontSize: 12, color: '#888', marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  freshnessDot: { width: 6, height: 6, borderRadius: 3 },
  metaTime: { fontSize: 10, color: '#bbb', fontWeight: '500' },
  metaText: { fontSize: 10, color: '#aaa' },
  shareBtn: { marginTop: 6, padding: 2 },
});
