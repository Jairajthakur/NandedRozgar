/**
 * JobCard.js — NandedRozgar
 * Redesigned for Tier-2/3 city users:
 *  • Large salary shown prominently in coloured badge
 *  • Marathi sub-label under job title
 *  • Big "Apply / अर्ज करा" button
 *  • WhatsApp icon if phone available
 *  • Clear location + job-type chips
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAT_ICONS } from '../utils/constants';

const ORANGE = '#f97316';
const GREEN  = '#25d366';
const TEAL   = '#0d9488';

/* Category → Marathi label */
const CAT_MR = {
  Delivery:       'डिलिव्हरी',
  Driver:         'ड्रायव्हर',
  Security:       'सुरक्षा रक्षक',
  Construction:   'बांधकाम',
  'Domestic Help':'घरकाम',
  TeleCaller:     'टेलिकॉलर',
  'Shop Assistant':'दुकान सहाय्यक',
  'Data Entry':   'डेटा एंट्री',
  Teaching:       'शिक्षक',
  Other:          'इतर',
};

function AnimCard({ children, delay = 0 }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function JobCard({ job, onPress, index = 0 }) {
  const applicants = job.applicant_count || 0;
  const isFeatured = !!job.featured;
  const isUrgent   = !!job.urgent;
  const accentColor = isUrgent ? '#ef4444' : ORANGE;
  const catMr      = CAT_MR[job.category] || '';
  const icon       = CAT_ICONS[job.category] || 'briefcase-outline';

  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  const skills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string' && job.skills
    ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <AnimCard delay={index * 80}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.97} style={s.card}>

          {/* Left accent bar */}
          <View style={[s.accentBar, { backgroundColor: accentColor }]} />

          <View style={s.cardInner}>

            {/* Top row: category icon + title + salary badge */}
            <View style={s.topRow}>
              <View style={[s.catIconBox, { backgroundColor: accentColor + '18' }]}>
                <Ionicons name={icon} size={20} color={accentColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                {/* urgent / featured badge */}
                {(isFeatured || isUrgent) && (
                  <View style={[s.badge, { backgroundColor: isFeatured ? ORANGE : '#ef4444' }]}>
                    <Ionicons name={isFeatured ? 'star' : 'flame'} size={9} color="#fff" />
                    <Text style={s.badgeTxt}>{isFeatured ? 'FEATURED' : 'URGENT'}</Text>
                  </View>
                )}
                <Text style={s.title} numberOfLines={2}>{job.title}</Text>
                {!!catMr && <Text style={s.titleMr}>{catMr}</Text>}
              </View>

              {/* Salary — shown prominently */}
              {!!job.salary && (
                <View style={s.salaryBadge}>
                  <Text style={s.salarySymbol}>₹</Text>
                  <Text style={s.salaryAmt}>{job.salary}</Text>
                  <Text style={s.salaryPer}>/mo</Text>
                </View>
              )}
            </View>

            {/* Company · Location row */}
            {(!!job.company || !!job.location) && (
              <View style={s.metaRow}>
                {!!job.company && (
                  <View style={s.metaChip}>
                    <Ionicons name="business-outline" size={11} color="#888" />
                    <Text style={s.metaChipTxt} numberOfLines={1}>{job.company}</Text>
                  </View>
                )}
                {!!job.location && (
                  <View style={s.metaChip}>
                    <Ionicons name="location-outline" size={11} color="#888" />
                    <Text style={s.metaChipTxt}>{job.location}</Text>
                  </View>
                )}
                {!!job.type && (
                  <View style={s.metaChip}>
                    <Ionicons name="time-outline" size={11} color="#888" />
                    <Text style={s.metaChipTxt}>{job.type}</Text>
                  </View>
                )}
                {!!job.poster_verified && (
                  <View style={[s.metaChip, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text style={[s.metaChipTxt, { color: '#059669' }]}>Verified</Text>
                  </View>
                )}
              </View>
            )}

            {/* Applicants info */}
            {applicants > 0 && (
              <View style={s.appliedRow}>
                <Ionicons name="people-outline" size={12} color={ORANGE} />
                <Text style={s.appliedTxt}>{applicants} जणांनी अर्ज केला</Text>
                {applicants >= 15 && <Text style={s.appliedHot}>  🔥 Trending</Text>}
              </View>
            )}

            {/* Skill chips — max 3 */}
            {skills.length > 0 && (
              <View style={s.chipsRow}>
                {skills.slice(0, 3).map((sk, i) => (
                  <View key={i} style={s.chip}>
                    <Text style={s.chipTxt}>{sk}</Text>
                  </View>
                ))}
                {skills.length > 3 && (
                  <View style={[s.chip, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
                    <Text style={[s.chipTxt, { color: '#8b5cf6' }]}>+{skills.length - 3}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Footer: WhatsApp hint + Apply button */}
            <View style={s.footer}>
              {!!job.phone && (
                <View style={s.waHint}>
                  <Ionicons name="logo-whatsapp" size={14} color={GREEN} />
                  <Text style={s.waHintTxt}>WhatsApp Available</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.applyBtn} onPress={handlePress} activeOpacity={0.8}>
                <Text style={s.applyBtnEn}>Apply</Text>
                <Text style={s.applyBtnMr}>अर्ज करा</Text>
              </TouchableOpacity>
            </View>

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
    borderColor: '#ebebeb',
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  accentBar: { width: 5, alignSelf: 'stretch' },
  cardInner: { flex: 1, padding: 14 },

  /* Top row */
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  catIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 6,
    paddingVertical: 3, paddingHorizontal: 8, marginBottom: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: '700', color: '#111', lineHeight: 22 },
  titleMr: { fontSize: 12, color: '#aaa', fontWeight: '500', marginTop: 1 },

  /* Salary badge */
  salaryBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5, borderColor: '#a7f3d0',
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  salarySymbol: { fontSize: 11, fontWeight: '800', color: TEAL, lineHeight: 13 },
  salaryAmt:   { fontSize: 16, fontWeight: '900', color: TEAL, lineHeight: 18 },
  salaryPer:   { fontSize: 9,  fontWeight: '600', color: '#6ee7b7', lineHeight: 11 },

  /* Meta chips */
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5f5f5', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 9,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  metaChipTxt: { fontSize: 11, color: '#666', fontWeight: '500' },

  /* Applicants */
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  appliedTxt: { fontSize: 12, color: ORANGE, fontWeight: '600' },
  appliedHot: { fontSize: 11, color: '#ef4444', fontWeight: '600' },

  /* Skill chips */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    borderWidth: 1, borderColor: '#e5e5e5',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11,
    backgroundColor: '#fafafa',
  },
  chipTxt: { fontSize: 11, fontWeight: '500', color: '#555' },

  /* Footer */
  footer: { flexDirection: 'row', alignItems: 'center' },
  waHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waHintTxt: { fontSize: 11, color: GREEN, fontWeight: '600' },

  /* Apply button — dual language */
  applyBtn: {
    backgroundColor: ORANGE,
    borderRadius: 22, paddingVertical: 9, paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  applyBtnEn: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 16 },
  applyBtnMr: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', lineHeight: 13 },
});
