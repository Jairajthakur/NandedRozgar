import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAT_ICONS } from '../utils/constants';
import { timeAgo } from '../utils/api';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

function GeoChip({ children, variant, iconName }) {
  const bg    = variant === 'orange' ? 'rgba(249,115,22,0.15)'
             : variant === 'gray'   ? 'rgba(255,255,255,0.06)'
             : variant === 'blue'   ? 'rgba(99,102,241,0.15)'
             : 'rgba(255,255,255,0.06)';
  const color = variant === 'orange' ? ORANGE
             : variant === 'blue'   ? '#818cf8'
             : 'rgba(255,255,255,0.4)';
  const borderColor = variant === 'orange' ? ORANGE + '35'
             : variant === 'blue' ? INDIGO + '35'
             : 'rgba(255,255,255,0.1)';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: bg, borderRadius: 20,
      paddingVertical: 3, paddingHorizontal: 9,
      marginRight: 5, marginTop: 5,
      borderWidth: 1, borderColor,
    }}>
      {iconName && <Ionicons name={iconName} size={9} color={color} style={{ marginRight: 3 }} />}
      <Text style={{ fontSize: 10, fontWeight: '600', color }}>{children}</Text>
    </View>
  );
}

export default function JobCard({ job, onPress }) {
  const iconName = CAT_ICONS[job.category] || 'briefcase-outline';
  const createdAt = job.created_at ? new Date(job.created_at).getTime() : Date.now();
  const ageDays = (Date.now() - createdAt) / 86400000;
  const freshnessColor = ageDays < 1 ? '#4ade80' : ageDays < 7 ? ORANGE : 'rgba(255,255,255,0.2)';
  const freshnessLabel = ageDays < 1 ? 'Today' : ageDays < 7 ? `${Math.floor(ageDays)}d ago` : timeAgo(createdAt);
  const applicants = job.applicant_count || 0;
  const accentColor = job.featured ? ORANGE : job.urgent ? '#ef4444' : INDIGO;

  async function shareJob(e) {
    e.stopPropagation?.();
    try {
      await Share.share({
        message: `Job Opening: ${job.title}${job.company ? ` at ${job.company}` : ''}\n${job.location || 'Nanded'}${job.salary ? ` | Rs.${job.salary}` : ''}\n\nApply on NandedRozgar!`,
      });
    } catch {}
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.card, { borderLeftColor: accentColor }]}
      activeOpacity={0.85}
    >
      {/* Top shimmer line */}
      <View style={s.shine} />

      {/* Background geometric accent */}
      <View style={[s.bgGeo, { borderColor: accentColor + '12', backgroundColor: accentColor + '04' }]} />

      {/* Feature/Urgent badge */}
      {job.featured && (
        <View style={[s.badge, { backgroundColor: ORANGE }]}>
          <Ionicons name="star" size={8} color="#fff" />
          <Text style={s.badgeTxt}>FEATURED</Text>
        </View>
      )}
      {job.urgent && !job.featured && (
        <View style={[s.badge, { backgroundColor: '#ef4444' }]}>
          <Ionicons name="flame" size={8} color="#fff" />
          <Text style={s.badgeTxt}>URGENT</Text>
        </View>
      )}

      <View style={[s.row, (job.featured || job.urgent) && { marginTop: 14 }]}>
        {/* Icon */}
        <View style={[s.iconWrap, { backgroundColor: accentColor + '18', borderColor: accentColor + '30' }]}>
          <Ionicons name={iconName} size={22} color={accentColor} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title} numberOfLines={1}>{job.title}</Text>
          {!!job.company && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="business-outline" size={10} color="rgba(255,255,255,0.3)" />
              <Text style={s.company} numberOfLines={1}>{job.company}</Text>
              {job.verified_employer && <Ionicons name="checkmark-circle" size={11} color="#4ade80" />}
            </View>
          )}
          <View style={s.chips}>
            {!!job.location && <GeoChip iconName="location-sharp">{job.location}</GeoChip>}
            {!!job.salary   && <GeoChip variant="orange" iconName="cash">Rs.{job.salary}</GeoChip>}
            {!!job.type     && <GeoChip variant="gray">{job.type}</GeoChip>}
            {!!job.category && <GeoChip variant="blue">{job.category}</GeoChip>}
          </View>
          {!!job.description && (
            <Text style={s.descPreview} numberOfLines={2}>{job.description}</Text>
          )}
        </View>

        {/* Meta */}
        <View style={s.meta}>
          <View style={s.freshnessRow}>
            <View style={[s.freshDot, { backgroundColor: freshnessColor }]} />
            <Text style={[s.metaTime, { color: freshnessColor }]}>{freshnessLabel}</Text>
          </View>
          {job.views > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
              <Ionicons name="eye-outline" size={10} color="rgba(255,255,255,0.2)" />
              <Text style={s.metaTxt}>{job.views}</Text>
            </View>
          )}
          {applicants > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
              <Ionicons name="people-outline" size={10} color={ORANGE} />
              <Text style={[s.metaTxt, { color: ORANGE, fontWeight: '700' }]}>{applicants}</Text>
            </View>
          )}
          <TouchableOpacity onPress={shareJob} style={s.shareBtn}>
            <Ionicons name="share-social-outline" size={13} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  shine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  bgGeo: { position: 'absolute', bottom: -8, right: -8, width: 60, height: 60, borderRadius: 12, borderWidth: 1, transform: [{ rotate: '20deg' }] },
  badge: { position: 'absolute', top: 0, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, zIndex: 10 },
  badgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  company: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  descPreview: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, lineHeight: 16 },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freshDot: { width: 5, height: 5, borderRadius: 3 },
  metaTime: { fontSize: 10, fontWeight: '500' },
  metaTxt: { fontSize: 10, color: 'rgba(255,255,255,0.2)' },
  shareBtn: { marginTop: 8, padding: 4 },
});
