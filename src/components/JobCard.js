import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const ORANGE = '#f97316';

// ── Animated card entry ────────────────────────────────────────────────────────
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
  const { lang, t } = useLang();
  const applicants = job.applicant_count || 0;
  const views      = job.views || 0;
  const isFeatured = !!job.featured;
  const isUrgent   = !!job.urgent;

  // Left accent bar — always shown; colour varies by priority
  const accentColor = isUrgent ? '#ef4444' : ORANGE;

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
          activeOpacity={0.97}
          style={s.card}
        >
          {/* Left accent bar — always visible */}
          <View style={[s.accentBar, { backgroundColor: accentColor }]} />

          <View style={s.cardInner}>
            {/* Badge: URGENT or FEATURED */}
            {(isFeatured || isUrgent) && (
              <View style={[s.badge, { backgroundColor: isFeatured ? ORANGE : '#ef4444' }]}>
                {isFeatured
                  ? <Ionicons name="star" size={9} color="#fff" />
                  : <Ionicons name="flame" size={9} color="#fff" />
                }
                <Text style={s.badgeTxt}>{isFeatured ? t('featured') : t('urgent')}</Text>
              </View>
            )}

            {/* Title + Salary */}
            <View style={s.titleRow}>
              <AutoTranslate text={job.title} lang={lang} style={s.title} numberOfLines={2} />
              {!!job.salary && <Text style={s.salary}>₹{job.salary}</Text>}
            </View>

            {/* Company · Location · Verified badge */}
            {(!!job.company || !!job.location) && (
              <View style={s.companyRow}>
                <Text style={s.subtitle} numberOfLines={1}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </Text>
                {!!job.poster_verified && (
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="#fff" />
                    <Text style={s.verifiedTxt}>{t('verified')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Applied & Views — right below company (Image 2 style) */}
            {(applicants > 0 || views > 0) && (
              <View style={s.metaRow}>
                {applicants > 0 && (
                  <Text style={s.metaApplied}>{applicants} {t('appliedCount')}</Text>
                )}
                {views > 0 && (
                  <Text style={s.metaViews}>{views} {t('views')}</Text>
                )}
              </View>
            )}

            {/* Skill chips */}
            {skills.length > 0 && (
              <View style={s.chipsRow}>
                {skills.slice(0, 4).map((sk, i) => (
                  <View key={i} style={s.chip}>
                    <AutoTranslate text={sk} lang={lang} style={s.chipTxt} />
                  </View>
                ))}
              </View>
            )}

            {/* Apply button — right-aligned, outlined pill (Image 2) */}
            <View style={s.footer}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.applyBtn} onPress={handlePress} activeOpacity={0.8}>
                <Text style={s.applyTxt}>{t('applyNow')}</Text>
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
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // Left accent bar (urgent = red, featured = orange)
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },

  cardInner: {
    flex: 1,
    padding: 16,
  },

  // Badge pill
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  title:  { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, lineHeight: 22 },
  salary: { fontSize: 13, fontWeight: '700', color: ORANGE, flexShrink: 0, paddingTop: 2 },

  subtitle: { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 6 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 6 },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // Meta: applied · views
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  metaApplied: { fontSize: 11, fontWeight: '600', color: ORANGE },
  metaViews:   { fontSize: 11, color: '#bbb', fontWeight: '400' },

  // Skill chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  chipTxt: { fontSize: 11, fontWeight: '500', color: '#555' },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center' },

  // Outlined orange pill Apply button (Image 2 style)
  applyBtn: {
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  applyTxt: { color: ORANGE, fontSize: 13, fontWeight: '700' },
});
