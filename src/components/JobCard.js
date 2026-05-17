import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAT_ICONS } from '../utils/constants';

const ORANGE = '#f97316';

// ── Animated card entry ────────────────────────────────────────────────────────
function AnimCard({ children, delay = 0, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export default function JobCard({ job, onPress, index = 0 }) {
  const iconName   = CAT_ICONS[job.category] || 'briefcase-outline';
  const applicants = job.applicant_count || 0;
  const views      = job.views || 0;
  const isFeatured = !!job.featured;
  const isUrgent   = !!job.urgent && !job.featured;
  const borderLeft = isFeatured ? ORANGE : isUrgent ? '#ef4444' : 'transparent';

  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  return (
    <AnimCard delay={index * 80}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={1}
          style={[s.card, borderLeft !== 'transparent' && { borderLeftColor: borderLeft, borderLeftWidth: 3 }]}
        >
          {/* Badge: URGENT / FEATURED */}
          {(isFeatured || isUrgent) && (
            <View style={[s.badge, { backgroundColor: isFeatured ? ORANGE : '#ef4444' }]}>
              <Ionicons name={isFeatured ? 'star' : 'flame'} size={9} color="#fff" />
              <Text style={s.badgeTxt}>{isFeatured ? 'FEATURED' : 'URGENT'}</Text>
            </View>
          )}

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1}>{job.title}</Text>
            {!!job.salary && <Text style={s.salary}>₹{job.salary}</Text>}
          </View>

          {/* Company · Location */}
          {(!!job.company || !!job.location) && (
            <Text style={s.subtitle} numberOfLines={1}>
              {[job.company, job.location].filter(Boolean).join(' · ')}
            </Text>
          )}

          {/* Skill chips */}
          {Array.isArray(job.skills) && job.skills.length > 0 && (
            <View style={s.chipsRow}>
              {job.skills.slice(0, 4).map((sk, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipTxt}>{sk}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer: meta + Apply */}
          <View style={s.footer}>
            <View style={s.metaRow}>
              {applicants > 0 && (
                <View style={s.metaItem}>
                  <Ionicons name="people-outline" size={11} color="#aaa" />
                  <Text style={s.metaTxt}>{applicants} applied</Text>
                </View>
              )}
              {views > 0 && (
                <View style={s.metaItem}>
                  <Ionicons name="eye-outline" size={11} color="#aaa" />
                  <Text style={s.metaTxt}>{views} views</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.applyBtn} onPress={handlePress} activeOpacity={0.8}>
              <Text style={s.applyTxt}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </AnimCard>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ebebeb',
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 5,
    paddingVertical: 3, paddingHorizontal: 9, marginBottom: 10,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title:    { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  salary:   { fontSize: 14, fontWeight: '700', color: ORANGE, flexShrink: 0 },
  subtitle: { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip:     { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11 },
  chipTxt:  { fontSize: 11, fontWeight: '600', color: '#555' },
  footer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metaRow:  { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt:  { fontSize: 11, color: '#aaa', fontWeight: '500' },
  applyBtn: { borderWidth: 1.5, borderColor: ORANGE, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 18 },
  applyTxt: { color: ORANGE, fontSize: 13, fontWeight: '700' },
});
