import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Linking, Alert,
  TouchableOpacity, Share, Animated, Easing, StatusBar,
  TextInput, Dimensions,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const ORANGE = '#f97316';
const GREEN  = '#25d366';
const { width: SW } = Dimensions.get('window');

/* ─── Floating particle dot ─── */
function Particle({ delay, x, size, color }) {
  const y   = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y,  { toValue: -60, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.55, duration: 600, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0,    duration: 1600, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(y,  { toValue: 0,   duration: 0, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0,   duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: 16, left: x,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: op,
        transform: [{ translateY: y }],
      }}
    />
  );
}

/* ─── Animated stat pill ─── */
function StatPill({ icon, value, label, delay }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, damping: 11, stiffness: 130 }),
      Animated.timing(op,    { toValue: 1, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.statPill, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name={icon} size={14} color={ORANGE} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Section fade-in ─── */
function FadeSection({ children, delay = 0 }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

/* ─── Action button ─── */
function ActionBtn({ label, icon, color, onPress, outline = false, delay = 0, disabled = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  const op     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,     { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 360, delay, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 65, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: slideY }, { scale }] }}>
      <TouchableOpacity
        onPress={press} activeOpacity={1}
        disabled={disabled}
        style={[
          s.actionBtn,
          outline
            ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e5e5' }
            : { backgroundColor: color },
          disabled && { opacity: 0.55 },
        ]}
      >
        {icon && <Ionicons name={icon} size={19} color={outline ? '#555' : '#fff'} />}
        <Text style={[s.actionBtnTxt, outline && { color: '#555' }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Skill chip ─── */
function SkillChip({ label, index }) {
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 60, useNativeDriver: true, damping: 12 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.skillChip, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name="star" size={11} color={ORANGE} />
      <Text style={s.skillTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Info row ─── */
function InfoRow({ icon, label, value, color }) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconBox, { backgroundColor: (color || ORANGE) + '18' }]}>
        <Ionicons name={icon} size={15} color={color || ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoRowLabel}>{label}</Text>
        <Text style={s.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ════════════════════════════ MAIN SCREEN ════════════════════════════ */
export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob]   = useState(initial);
  const { user, role, loadJobs } = useAuth();
  const { lang, t } = useLang();
  const insets = useSafeAreaInsets();

  const [ratingModal,       setRatingModal]       = useState(false);
  const [myRating,          setMyRating]           = useState(0);
  const [ratingComment,     setRatingComment]       = useState('');
  const [submittingRating,  setSubmittingRating]   = useState(false);
  const [showReport,        setShowReport]         = useState(false);
  const [applying,          setApplying]           = useState(false);

  // Hero animation refs
  const iconScale   = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered hero entrance
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, delay: 120, damping: 10, stiffness: 110, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
        Animated.spring(ringScale,   { toValue: 1, delay: 200, damping: 12, stiffness: 90, useNativeDriver: true }),
      ]),
    ]).start();

    // Continuous pulse on icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const isOwner    = job.posted_by === user?.id || role === 'admin';
  const applicants = job.applicant_count || 0;
  const icon       = CAT_ICONS[job.category] || 'briefcase-outline';

  const skills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string' && job.skills
    ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : typeof job.requirements === 'string' && job.requirements
    ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean)
    : [];

  async function applyJob() {
    if (applying) return;
    setApplying(true);
    try {
      const r = await http('POST', `/api/jobs/${job.id}/apply`);
      if (r?.ok) {
        setJob(j => ({ ...j, applicant_count: (j.applicant_count || 0) + 1 }));
        await loadJobs();
        Toast.show({ type: 'success', text1: '✅ Applied! Good luck!' });
      } else {
        Toast.show({ type: 'error', text1: r?.error || 'Failed to apply. Please try again.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error. Please try again.' });
    } finally {
      setApplying(false);
    }
  }

  async function deleteJob() {
    Alert.alert(t('deleteJob'), t('deleteConfirm'), [
      { text: t('cancel') },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await http('DELETE', `/api/jobs/${job.id}`);
        await loadJobs(); navigation.goBack();
        Toast.show({ type: 'success', text1: 'Job deleted.' });
      }},
    ]);
  }

  function openWhatsApp() {
    const phone = (job.phone || '').replace(/\D/g, '');
    const msg   = encodeURIComponent(`Hi, I saw your job posting for ${job.title}. I am interested.`);
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareJob() {
    try {
      await Share.share({
        message: `Job: ${job.title}${job.company ? ` at ${job.company}` : ''}\n${job.location || 'Nanded'}${job.salary ? ` | ₹${String(job.salary).replace(/^₹/, "")}` : ''}\n\nApply on CityPlus!`,
      });
    } catch {}
  }

  async function submitRating() {
    if (!myRating) return;
    setSubmittingRating(true);
    const r = await http('POST', '/api/ratings', {
      jobId: job.id, ratedId: job.posted_by, stars: myRating, comment: ratingComment,
    });
    setSubmittingRating(false);
    setRatingModal(false);
    if (r?.ok) Toast.show({ type: 'success', text1: '⭐ Rating submitted!' });
  }

  async function submitReport(reason) {
    setShowReport(false);
    await http('POST', `/api/jobs/${job.id}/report`, { reason });
    Toast.show({ type: 'success', text1: 'Report submitted.' });
  }

  /* ─── Particles config ─── */
  const PARTICLES = [
    { x: SW * 0.12, size: 7,  color: 'rgba(255,255,255,0.6)', delay: 0 },
    { x: SW * 0.28, size: 5,  color: 'rgba(255,255,255,0.4)', delay: 400 },
    { x: SW * 0.45, size: 9,  color: 'rgba(255,200,100,0.5)', delay: 800 },
    { x: SW * 0.62, size: 5,  color: 'rgba(255,255,255,0.35)',delay: 200 },
    { x: SW * 0.78, size: 7,  color: 'rgba(255,255,255,0.55)',delay: 600 },
    { x: SW * 0.90, size: 4,  color: 'rgba(255,200,100,0.4)', delay: 1000 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
      {/* ══════════ HERO HEADER ══════════ */}
      <Animated.View style={[s.hero, { paddingTop: insets.top + 52, opacity: heroOpacity }]}>

        {/* Decorative arcs */}
        <View style={s.arcTop} />
        <View style={s.arcBottom} />

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <Particle key={i} x={p.x} size={p.size} color={p.color} delay={p.delay} />
        ))}

        {/* Top nav — absolutely positioned top-right, no back button */}
        <View style={[s.heroNav, { top: insets.top + 10 }]}>
          <TouchableOpacity style={s.navBtn} onPress={() => setShowReport(true)} activeOpacity={0.85}>
            <Ionicons name="flag-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} activeOpacity={0.85}>
            <Ionicons name="heart-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Pulsing ring + icon, stacked via absolute inside a sized wrapper */}
        <View style={s.iconContainer}>
          <Animated.View style={[s.iconRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={[s.heroIconWrap, { transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }] }]}>
            <Ionicons name={icon} size={34} color={ORANGE} />
          </Animated.View>
        </View>

        {/* Job title below icon */}
        <AutoTranslate text={job.title} lang={lang} style={s.heroTitle} numberOfLines={2} />
        {!!job.company && (
          <View style={s.heroCompanyRow}>
            <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={s.heroCompanyTxt}>{job.company}</Text>
            {!!job.poster_verified && (
              <View style={s.heroBadge}>
                <Ionicons name="checkmark-circle" size={10} color="#4ade80" />
                <Text style={s.heroBadgeTxt}>{t('verified')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stat pills */}
        <View style={s.statsRow}>
          {!!job.salary && (
            <StatPill icon="cash-outline"   value={`₹${String(job.salary).replace(/^₹/, "")}`}    label="Salary"   delay={300} />
          )}
          {!!job.type && (
            <StatPill icon="time-outline"   value={job.type}             label="Type"     delay={380} />
          )}
          {applicants > 0 && (
            <StatPill icon="people-outline" value={`${applicants}`}      label="Applied"  delay={460} />
          )}
          {!!job.location && (
            <StatPill icon="location-outline" value={job.location}       label="Location" delay={540} />
          )}
        </View>

        {/* Urgent tag */}
        {!!job.urgent && (
          <View style={s.urgentBanner}>
            <Ionicons name="flame" size={13} color="#fff" />
            <Text style={s.urgentTxt}>{t('urgentHiring')}</Text>
          </View>
        )}
      </Animated.View>

        {/* Quick info row */}
        <FadeSection delay={100}>
          <View style={s.quickInfoCard}>
            {!!job.salary && (
              <InfoRow icon="cash-outline"    label="Salary"    value={`₹${String(job.salary).replace(/^₹/, "")}`}   color="#16a34a" />
            )}
            {!!job.type && (
              <InfoRow icon="time-outline"    label="Job Type"  value={job.type}            color="#0891b2" />
            )}
            {!!job.location && (
              <InfoRow icon="location-outline" label="Location" value={job.location}        color="#7c3aed" />
            )}
            {!!job.category && (
              <InfoRow icon="briefcase-outline" label="Category" value={job.category}       color={ORANGE} />
            )}
          </View>
        </FadeSection>

        {/* Description */}
        {!!job.description && (
          <FadeSection delay={160}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderDot} />
                <Text style={s.cardTitle}>{t('jobDescription')}</Text>
              </View>
              <AutoTranslate text={job.description} lang={lang} style={s.descText} />
            </View>
          </FadeSection>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <FadeSection delay={220}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={s.cardTitle}>{t('skillsRequired')}</Text>
              </View>
              <View style={s.skillsRow}>
                {skills.map((sk, i) => <SkillChip key={i} label={sk} index={i} />)}
              </View>
            </View>
          </FadeSection>
        )}

        {/* Requirements */}
        {requirements.length > 0 && (
          <FadeSection delay={280}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#0891b2' }]} />
                <Text style={s.cardTitle}>{t('requirements')}</Text>
              </View>
              {requirements.map((req, i) => (
                <View key={i} style={s.reqRow}>
                  <View style={s.reqDot} />
                  <Text style={s.reqTxt}>{req}</Text>
                </View>
              ))}
            </View>
          </FadeSection>
        )}

        {/* Company card */}
        {!!job.company && (
          <FadeSection delay={340}>
            <View style={s.companyCard}>
              <View style={s.companyIconWrap}>
                <Text style={s.companyInitial}>{(job.company[0] || 'C').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.companyName}>{job.company}</Text>
                {!!job.location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Ionicons name="location-outline" size={11} color="#888" />
                    <Text style={s.companyLoc}>{job.location}</Text>
                  </View>
                )}
              </View>
              {!!job.poster_verified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
                  <Text style={s.verifiedTxt}>{t('verified')}</Text>
                </View>
              )}
            </View>
          </FadeSection>
        )}

        {/* ── Action Buttons ── */}
        <View style={s.actionsBlock}>
          {!isOwner && (
            <ActionBtn label={applying ? 'Applying…' : 'Apply Now'} icon="briefcase-outline" color={ORANGE} onPress={applyJob} delay={0} disabled={applying} />
          )}
          {!!job.phone && (
            <ActionBtn label="Chat on WhatsApp"   icon="logo-whatsapp"        color={GREEN}  onPress={openWhatsApp}           delay={80} />
          )}
          {!isOwner && (
            <ActionBtn label={t('rateEmployer')} icon="star-outline"         color="#f59e0b" onPress={() => setRatingModal(true)} delay={160} />
          )}
          <ActionBtn   label={t('shareJob')}          icon="share-social-outline" outline        onPress={shareJob}               delay={240} />
          {isOwner && (
            <ActionBtn label={t('deleteJob')}         icon="trash-outline"        color="#ef4444" onPress={deleteJob}             delay={0} />
          )}
        </View>
      </ScrollView>

      {/* ── Rating Modal ── */}
      {ratingModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Ionicons name="star" size={36} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={s.modalTitle}>{t('rateEmployer')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setMyRating(star)}>
                  <Ionicons name={star <= myRating ? 'star' : 'star-outline'} size={34} color={star <= myRating ? '#f59e0b' : '#ddd'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.textArea}
              placeholder="Leave a comment (optional)"
              placeholderTextColor="#bbb"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
            <TouchableOpacity
              style={[s.modalPrimaryBtn, { backgroundColor: myRating ? '#f59e0b' : '#e5e7eb' }]}
              onPress={submitRating}
              disabled={!myRating || submittingRating}
            >
              <Text style={[s.modalPrimaryBtnTxt, !myRating && { color: '#9ca3af' }]}>
                {submittingRating ? t('loading') : t('submitRating')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setRatingModal(false)}>
              <Text style={s.cancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Report Modal ── */}
      {showReport && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Ionicons name="flag" size={32} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={s.modalTitle}>{t('reportJob')}</Text>
            {['Spam or fake', 'Fraud / scam', 'Inappropriate content', 'Job already filled', 'Other'].map(reason => (
              <TouchableOpacity key={reason} style={s.reportOption} onPress={() => submitReport(reason)}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={s.reportOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowReport(false)}>
              <Text style={s.cancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  /* ── Hero ── */
  hero: {
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  arcTop: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  arcBottom: {
    position: 'absolute', bottom: -80, left: -40,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  heroNav: {
    position: 'absolute', right: 16,
    flexDirection: 'row', gap: 8,
    zIndex: 10,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconContainer: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 8,
  },
  iconRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '900', color: '#fff',
    textAlign: 'center', lineHeight: 28, letterSpacing: -0.3,
    marginBottom: 8, paddingHorizontal: 10,
  },
  heroCompanyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 18,
  },
  heroCompanyTxt: { fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: '600' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  heroBadgeTxt: { fontSize: 10, color: '#4ade80', fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginBottom: 6,
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  statValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dc2626', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 14, marginTop: 10,
  },
  urgentTxt: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  /* ── Quick Info ── */
  quickInfoCard: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 12,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoRowLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.4 },
  infoRowValue: { fontSize: 14, color: '#0f172a', fontWeight: '700', marginTop: 1 },

  /* ── Cards ── */
  card: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardHeaderDot: { width: 4, height: 18, borderRadius: 2, backgroundColor: ORANGE },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 1.2 },
  descText: { fontSize: 14, lineHeight: 23, color: '#334155' },

  /* ── Skills ── */
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff7ed', borderRadius: 20,
    borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 7, paddingHorizontal: 14,
  },
  skillTxt: { fontSize: 12, fontWeight: '700', color: '#c2410c' },

  /* ── Requirements ── */
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 8, flexShrink: 0 },
  reqTxt: { fontSize: 14, color: '#334155', lineHeight: 22, flex: 1 },

  /* ── Company card ── */
  companyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  companyIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  companyInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  companyName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  companyLoc:  { fontSize: 12, color: '#64748b' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#86efac',
    paddingVertical: 5, paddingHorizontal: 9,
  },
  verifiedTxt: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  /* ── Actions ── */
  actionsBlock: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* ── Modals ── */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 22, padding: 22,
    width: '88%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  modalTitle: {
    fontSize: 17, fontWeight: '900', color: '#0f172a',
    textAlign: 'center', marginBottom: 16,
  },
  textArea: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 12, fontSize: 13, color: '#111',
    marginBottom: 14, minHeight: 70, textAlignVertical: 'top',
  },
  modalPrimaryBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  modalPrimaryBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 12 },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  reportOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: 12,
    borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fef2f2', marginBottom: 8,
  },
  reportOptionTxt: { fontSize: 13, fontWeight: '600', color: '#334155' },
});

export {};
