import React, { useState, useRef, useEffect } from 'react';
import {
  Platform,
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
import BannerAd from '../components/ads/BannerAd';
import { useIsPremium } from '../hooks/useIsPremium';

const ORANGE = '#f97316';
const GREEN  = '#25d366';
const { width: SW } = Dimensions.get('window');

function formatSalary(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/₹/.test(str) && (/–|-|to/i.test(str) || /\/mo/i.test(str))) return str;
  const cleaned = str.replace(/₹/g, '').replace(/\/mo(nth)?/gi, '').trim();
  const parseNum = (s) => { const n = parseFloat(s.replace(/,/g, '')); return /k/i.test(s) ? n * 1000 : n; };
  const fmt = (n) => Math.round(n).toLocaleString('en-IN');
  const rangeMatch = cleaned.match(/^([\d,]+k?)\s*[-–to]+\s*([\d,]+k?)$/i);
  if (rangeMatch) return `₹${fmt(parseNum(rangeMatch[1]))} – ₹${fmt(parseNum(rangeMatch[2]))}/month`;
  const singleMatch = cleaned.match(/^([\d,]+k?)$/i);
  if (singleMatch) return `₹${fmt(parseNum(singleMatch[1]))}/month`;
  return /[₹$£€]/.test(str) ? str : `₹${str}`;
}

/* ─── Floating particle dot ─── */
function Particle({ delay, x, size, color }) {
  const y   = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y,  { toValue: -60, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.55, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(op, { toValue: 0,    duration: 1600, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(y,  { toValue: 0,   duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(op, { toValue: 0,   duration: 0, useNativeDriver: Platform.OS !== 'web' }),
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
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: Platform.OS !== 'web', damping: 11, stiffness: 130 }),
      Animated.timing(op,    { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.statPill, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name={icon} size={14} color={ORANGE} />
      <Text style={s.statValue} numberOfLines={2}>{value}</Text>
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
      Animated.timing(op, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
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
      Animated.timing(op,     { toValue: 1, duration: 360, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideY, { toValue: 0, duration: 360, delay, easing: Easing.out(Easing.back(1.1)), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 65, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', damping: 8, stiffness: 200 }),
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
      Animated.timing(op,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, delay: index * 60, useNativeDriver: Platform.OS !== 'web', damping: 12 }),
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
  const isPremium = useIsPremium();
  const insets = useSafeAreaInsets();

  const [ratingModal,       setRatingModal]       = useState(false);
  const [myRating,          setMyRating]           = useState(0);
  const [ratingComment,     setRatingComment]       = useState('');
  const [submittingRating,  setSubmittingRating]   = useState(false);
  const [showReport,        setShowReport]         = useState(false);
  const [applying,          setApplying]           = useState(false);
  const [saved,             setSaved]              = useState(job.is_saved || false);
  const savedScale = useRef(new Animated.Value(1)).current;

  // ── Fetch full job details (description + requirements not in list API) ───
  // The job list endpoint omits description/requirements for performance.
  // We fetch the full record from /api/jobs/:id on mount so those sections show.
  useEffect(() => {
    async function fetchFullJob() {
      try {
        const r = await http('GET', `/api/jobs/${initial.id}`);
        if (r?.ok && r.job) {
          setJob(prev => ({ ...prev, ...r.job }));
        }
      } catch (e) {
        console.warn('[JobDetail] fetchFullJob failed:', e.message);
      }
    }
    fetchFullJob();
  }, [initial.id]);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 12 }),
      Animated.spring(savedScale, { toValue: 1,   useNativeDriver: Platform.OS !== 'web', speed: 25 }),
    ]).start();
    try {
      await http('POST', `/api/jobs/${job.id}/save`);
    } catch {
      setSaved(!next); // revert on error
    }
  }

  // Hero animation refs
  const iconScale   = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered hero entrance
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(iconScale, { toValue: 1, delay: 120, damping: 10, stiffness: 110, useNativeDriver: Platform.OS !== 'web' }),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(ringScale,   { toValue: 1, delay: 200, damping: 12, stiffness: 90, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();

    // Continuous pulse on icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
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
        message: `Job: ${job.title}${job.company ? ` at ${job.company}` : ''}\n${job.location || 'Nanded'}${job.salary ? ` | ${formatSalary(job.salary)}` : ''}\n\nApply on CityPlus!`,
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
          <Animated.View style={{ transform: [{ scale: savedScale }] }}>
            <TouchableOpacity style={s.navBtn} onPress={toggleSave} activeOpacity={0.85}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ef4444' : '#fff'} />
            </TouchableOpacity>
          </Animated.View>
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
            <StatPill icon="cash-outline"   value={formatSalary(job.salary)}    label="Salary"   delay={300} />
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
              <InfoRow icon="cash-outline"    label="Salary"    value={formatSalary(job.salary)}   color="#16a34a" />
            )}
            {!!job.type && (
              <InfoRow icon="time-outline"    label="Job Type"  value={job.type}            color="#0891b2" />
            )}
            {!!job.location && (
              <InfoRow icon="location-outline" label="Location" value={job.location}        color="#7c3aed" />
            )}
            {!!job.address && (
              <InfoRow icon="navigate-outline" label="Address"  value={job.address}         color="#7c3aed" />
            )}
            {!!job.category && (
              <InfoRow icon="briefcase-outline" label="Category" value={job.category}       color={ORANGE} />
            )}
            {!!job.openings && (
              <InfoRow icon="people-outline"    label="Openings" value={job.openings}        color="#db2777" />
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
              <View style={s.companyIco
