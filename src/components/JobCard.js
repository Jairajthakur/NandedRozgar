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
  const applicants = job.applicant_count || 0;
  const views      = job.views || 0;
  const isFeatured = !!job.featured;
  const isUrgent   = !!job.urgent;

  // Orange left border for both urgent and featured (matches Image 1)
  const borderLeftColor = (isFeatured || isUrgent) ? ORANGE : 'transparent';
  const borderLeftWidth = (isFeatured || isUrgent) ? 4 : 0;

  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  // Parse skills (array or comma-string)
  const skills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string' && job.skills
    ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <AnimCard delay={index * 80}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={1}
          style={[s.card, { borderLeftColor, borderLeftWidth }]}
        >
          {/* Badge: URGENT or FEATURED */}
          {(isFeatured || isUrgent) && (
            <View style={[s.badge, { backgroundColor: isFeatured ? ORANGE : '#ef4444' }]}>
              {isFeatured
                ? <Ionicons name="star" size={9} color="#fff" />
                : <Ionicons name="flame" size={9} color="#fff" />
              }
              <Text style={s.badgeTxt}>{isFeatured ? 'FEATURED' : 'URGENT'}</Text>
            </View>
          )}

          {/* Title + Salary */}
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
          {skills.length > 0 && (
            <View style={s.chipsRow}>
              {skills.slice(0, 4).map((sk, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipTxt}>{sk}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer: applied/views + Apply button */}
          <View style={s.footer}>
            <View style={s.metaRow}>
              {applicants > 0 && (
                <Text style={s.metaApplied}>{applicants} applied</Text>
              )}
              {views > 0 && (
                <Text style={s.metaViews}>{views} views</Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  title:  { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  salary: { fontSize: 13, fontWeight: '700', color: ORANGE, flexShrink: 0 },

  subtitle: { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 10 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  chipTxt: { fontSize: 11, fontWeight: '500', color: '#555' },

  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Applied count = orange, views = light gray — per screenshot
  metaApplied: { fontSize: 11, fontWeight: '600', color: ORANGE },
  metaViews:   { fontSize: 11, color: '#bbb', fontWeight: '400' },

  // Filled orange Apply button — per Image 1
  applyBtn: {
    backgroundColor: ORANGE,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  applyTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
