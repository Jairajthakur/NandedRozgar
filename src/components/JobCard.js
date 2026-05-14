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

  // Applicant fill percentage (when slots defined)
  const slots = job.slots || 0;
  const applicants = job.applicant_count || 0;
  const fillPct = slots > 0 ? Math.min((applicants / slots) * 100, 100) : 0;
  const showFillBar = slots > 0 && applicants > 0;
  const slotsLeft = Math.max(slots - applicants, 0);

  // Skills — show first 3 tags
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 3) : [];

  // Experience chip label
  const expLabel = job.experience
    ? job.experience
    : job.fresher_ok
    ? 'Fresher OK'
    : null;

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
          {/* Title + verified */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
            {job.verified_employer && (
              <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
            )}
          </View>

          <Text style={styles.company} numberOfLines={1}>{job.company}</Text>

          {/* Chips row: location, salary, type, experience */}
          <View style={styles.chips}>
            <Chip iconName="location-sharp">{job.location}</Chip>
            <Chip variant="orange" iconName="cash">{job.salary}</Chip>
            <Chip variant="gray">{job.type}</Chip>
            {expLabel && <Chip variant="green">{expLabel}</Chip>}
          </View>

          {/* Skill tags */}
          {skills.length > 0 && (
            <View style={styles.skillsRow}>
              {skills.map((sk, i) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={styles.skillTagTxt}>{sk}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Applicant fill bar */}
          {showFillBar && (
            <View style={styles.fillBarWrap}>
              <View style={styles.fillBarLabelRow}>
                <Text style={styles.fillBarLabel}>Slots filling</Text>
                <Text style={[
                  styles.fillBarCount,
                  fillPct >= 80 && { color: '#ef4444' },
                ]}>
                  {applicants}/{slots} applied
                </Text>
              </View>
              <View style={styles.fillBarTrack}>
                <View style={[styles.fillBarFill, { width: `${fillPct}%` }]} />
              </View>
              {slotsLeft <= 2 && slotsLeft > 0 && (
                <Text style={styles.fillBarUrgent}>⚠ Only {slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left!</Text>
              )}
            </View>
          )}
        </View>

        {/* Right meta column */}
        <View style={styles.meta}>
          <View style={styles.freshnessRow}>
            <View style={[styles.freshnessDot, { backgroundColor: freshnessColor }]} />
            <Text style={[styles.metaTime, { color: freshnessColor }]}>{freshnessLabel}</Text>
          </View>
          {job.views > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="eye" size={10} color="#aaa" />
              <Text style={styles.metaText}> {job.views}</Text>
            </View>
          )}
          {applicants > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="people" size={10} color={ORANGE} />
              <Text style={[styles.metaText, { color: ORANGE, fontWeight: '700' }]}> {applicants}</Text>
            </View>
          )}
          <TouchableOpacity onPress={shareJob} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={13} color="#aaa" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ children, variant, iconName }) {
  const bg    = variant === 'orange' ? '#fff7ed'
              : variant === 'gray'   ? '#f0f0f0'
              : variant === 'green'  ? '#f0fdf4'
              : '#f5f5f5';
  const color = variant === 'orange' ? ORANGE
              : variant === 'green'  ? '#15803d'
              : '#555';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: bg, borderRadius: 20,
      paddingVertical: 3, paddingHorizontal: 9,
      marginRight: 5, marginTop: 5,
    }}>
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
  // Skill tags
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  skillTag: {
    backgroundColor: '#f8f8f8',
    borderWidth: 0.5,
    borderColor: '#e5e5e5',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  skillTagTxt: { fontSize: 10, color: '#666', fontWeight: '500' },
  // Fill bar
  fillBarWrap: { marginTop: 8 },
  fillBarLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  fillBarLabel: { fontSize: 9, color: '#aaa', fontWeight: '500' },
  fillBarCount: { fontSize: 9, color: '#888', fontWeight: '600' },
  fillBarTrack: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' },
  fillBarFill: { height: '100%', backgroundColor: ORANGE, borderRadius: 2 },
  fillBarUrgent: { fontSize: 9, color: '#ef4444', fontWeight: '700', marginTop: 3 },
  // Meta
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  freshnessDot: { width: 6, height: 6, borderRadius: 3 },
  metaTime: { fontSize: 10, color: '#bbb', fontWeight: '500' },
  metaText: { fontSize: 10, color: '#aaa' },
  shareBtn: { marginTop: 6, padding: 2 },
});
