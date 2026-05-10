import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, CAT_ICONS } from '../utils/constants';
import { timeAgo } from '../utils/api';

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
      {job.urgent && (
        <View style={[styles.featBadge, { left: 14, right: undefined, backgroundColor: '#555' }]}>
          <Text style={styles.badgeText}>🔥 URGENT</Text>
        </View>
      )}

      <View style={[styles.row, (job.featured || job.urgent) && { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
              <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
            </View>
          </View>
          <View style={styles.chips}>
            <Chip>📍 {job.location}</Chip>
            <Chip variant="gold">💰 {job.salary}</Chip>
            <Chip variant="gray">{job.type}</Chip>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{timeAgo(job.timestamp)}</Text>
          <Text style={styles.metaText}>👁 {job.views || 0}</Text>
          {job.applicant_count > 0 && (
            <Text style={[styles.metaText, { color: C.dark, fontWeight: '700' }]}>
              👤 {job.applicant_count}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ children, variant }) {
  const bg = variant === 'gold' ? '#e8e8e8' : variant === 'gray' ? '#eee' : '#f0f0f0';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingVertical: 3,
      paddingHorizontal: 9, marginRight: 5, marginTop: 5 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.text }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  featured: {
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  urgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#444',
  },
  featBadge: {
    position: 'absolute',
    top: 0,
    right: 14,
    backgroundColor: '#222',
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    paddingVertical: 2,
    paddingHorizontal: 9,
    zIndex: 10,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  company: { fontSize: 12, color: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  metaText: { fontSize: 10, color: '#aaa', marginTop: 2 },
});
