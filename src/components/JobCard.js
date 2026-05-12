import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, CAT_ICONS } from '../utils/constants';
import { timeAgo } from '../utils/api';

const ORANGE = '#f97316';

export default function JobCard({ job, onPress }) {
  const icon = CAT_ICONS[job.category] || '💼';

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
          <Text style={styles.badgeText}>⭐ FEATURED</Text>
        </View>
      )}
      {job.urgent && !job.featured && (
        <View style={[styles.featBadge, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.badgeText}>🔥 URGENT</Text>
        </View>
      )}

      <View style={[styles.row, (job.featured || job.urgent) && { marginTop: 12 }]}>
        <View style={styles.iconWrap}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
          <View style={styles.chips}>
            <Chip>📍 {job.location}</Chip>
            <Chip variant="orange">💰 {job.salary}</Chip>
            <Chip variant="gray">{job.type}</Chip>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaTime}>{timeAgo(job.timestamp)}</Text>
          {job.views > 0 && <Text style={styles.metaText}>👁 {job.views}</Text>}
          {job.applicant_count > 0 && (
            <Text style={[styles.metaText, { color: ORANGE, fontWeight: '700' }]}>
              👤 {job.applicant_count}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ children, variant }) {
  const bg    = variant === 'orange' ? '#fff7ed' : variant === 'gray' ? '#f0f0f0' : '#f5f5f5';
  const color = variant === 'orange' ? ORANGE : '#555';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingVertical: 3,
      paddingHorizontal: 9, marginRight: 5, marginTop: 5 }}>
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
  featured: {
    borderColor: '#f97316',
    borderLeftWidth: 3,
  },
  urgent: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  featBadge: {
    position: 'absolute',
    top: 0, right: 14,
    backgroundColor: '#f97316',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 9,
    zIndex: 10,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#111' },
  company: { fontSize: 12, color: '#888', marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  metaTime: { fontSize: 10, color: '#bbb', fontWeight: '500' },
  metaText: { fontSize: 10, color: '#aaa', marginTop: 2 },
});
