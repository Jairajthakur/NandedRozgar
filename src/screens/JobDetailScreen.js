import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Linking, Alert,
  TouchableOpacity, Share, Animated, Easing, StatusBar,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';
const GREEN  = '#25d366';

// ── Section fade-in ───────────────────────────────────────────────────────────
function FadeSection({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ── Animated action button ────────────────────────────────────────────────────
function ActionBtn({ label, icon, color, onPress, outline = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={[s.actionBtnWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={press}
        activeOpacity={1}
        style={[
          s.actionBtn,
          outline
            ? { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' }
            : { backgroundColor: color },
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={outline ? '#555' : '#fff'} />}
        <Text style={[s.actionBtnTxt, outline && { color: '#555' }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skill chip — star icon matching the screenshot ────────────────────────────
function SkillChip({ label }) {
  return (
    <View style={s.skillChip}>
      <Ionicons name="star-outline" size={13} color={ORANGE} />
      <Text style={s.skillTxt}>{label}</Text>
    </View>
  );
}

export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob]   = useState(initial);
  const [showReport, setShowReport] = useState(false);
  const { user, role, loadJobs } = useAuth();
  const insets = useSafeAreaInsets();

  const applicants = job.applicant_count || 0;
  const isOwner    = job.posted_by === user?.id || role === 'admin';
  const icon       = CAT_ICONS[job.category] || 'briefcase-outline';

  // Hero icon bounce-in
  const iconScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: 1, damping: 10, stiffness: 100,
      useNativeDriver: true, delay: 150,
    }).start();
  }, []);

  // Back button press
  const backScale = useRef(new Animated.Value(1)).current;
  const handleBack = () => {
    Animated.sequence([
      Animated.timing(backScale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(backScale,  { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    navigation.goBack();
  };

  async function applyJob() {
    const r = await http('POST', `/api/jobs/${job.id}/apply`);
    if (r.ok) {
      setJob(j => ({ ...j, applicant_count: (j.applicant_count || 0) + 1 }));
      await loadJobs();
      Toast.show({ type: 'success', text1: '✅ Marked as Applied! Good luck!' });
    }
  }

  async function deleteJob() {
    Alert.alert('Delete Job', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await http('DELETE', `/api/jobs/${job.id}`);
        await loadJobs(); navigation.goBack();
        Toast.show({ type: 'success', text1: 'Job deleted.' });
      }},
    ]);
  }

  function openWhatsApp() {
    const phone = (job.phone || '').replace(/\D/g, '');
    const msg   = encodeURIComponent(`Hi, I saw your job posting on NandedRozgar for ${job.title}. I am interested.`);
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareJob() {
    try {
      await Share.share({
        message: `Job: ${job.title}${job.company ? ` at ${job.company}` : ''}\n${job.location || 'Nanded'}${job.salary ? ` | ₹${job.salary}` : ''}\n\nApply on NandedRozgar!`,
      });
    } catch {}
  }

  async function submitReport(reason) {
    setShowReport(false);
    await http('POST', `/api/jobs/${job.id}/report`, { reason });
    Toast.show({ type: 'success', text1: 'Report submitted.' });
  }

  // Parse skills
  const skills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string' && job.skills
    ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Parse requirements
  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : typeof job.requirements === 'string' && job.requirements
    ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      {/* ── Orange Hero Header ── */}
      <View style={[s.hero, { paddingTop: insets.top + 12 }]}>
        <View style={s.heroNav}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <TouchableOpacity style={s.navBtn} onPress={handleBack} activeOpacity={1}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={s.navBtn} activeOpacity={0.85}>
            <Ionicons name="heart-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Briefcase icon — matching screenshot */}
        <Animated.View style={[s.heroIconWrap, { transform: [{ scale: iconScale }] }]}>
          <Ionicons name={icon} size={32} color={ORANGE} />
        </Animated.View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title Block ── */}
        <FadeSection delay={0}>
          <View style={s.titleBlock}>
            <View style={s.titleRow}>
              <Text style={s.title}>{job.title}</Text>
              {!!job.salary && <Text style={s.salaryBig}>₹{job.salary}</Text>}
            </View>

            {/* Location row */}
            {(!!job.company || !!job.location) && (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="#aaa" />
                <Text style={s.locationTxt}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}

            {/* Type + Applied badges — pill style matching screenshot */}
            <View style={s.badgesRow}>
              {!!job.type && (
                <View style={s.infoBadge}>
                  <Ionicons name="time-outline" size={12} color="#666" />
                  <Text style={s.infoBadgeTxt}>{job.type}</Text>
                </View>
              )}
              {applicants > 0 && (
                <View style={s.infoBadge}>
                  <Ionicons name="people-outline" size={12} color="#666" />
                  <Text style={s.infoBadgeTxt}>{applicants} applied</Text>
                </View>
              )}
              {!!job.urgent && (
                <View style={[s.infoBadge, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                  <Ionicons name="flame" size={12} color="#ef4444" />
                  <Text style={[s.infoBadgeTxt, { color: '#ef4444' }]}>Urgent</Text>
                </View>
              )}
            </View>
          </View>
        </FadeSection>

        {/* ── Job Description ── */}
        {!!job.description && (
          <FadeSection delay={80}>
            <View style={s.section}>
              <Text style={s.sectionHead}>JOB DESCRIPTION</Text>
              <Text style={s.descText}>{job.description}</Text>
            </View>
          </FadeSection>
        )}

        {/* ── Skills Required ── */}
        {skills.length > 0 && (
          <FadeSection delay={140}>
            <View style={s.section}>
              <Text style={s.sectionHead}>SKILLS REQUIRED</Text>
              <View style={s.skillsRow}>
                {skills.map((sk, i) => <SkillChip key={i} label={sk} />)}
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Requirements ── */}
        {requirements.length > 0 && (
          <FadeSection delay={200}>
            <View style={s.section}>
              <Text style={s.sectionHead}>REQUIREMENTS</Text>
              {requirements.map((req, i) => (
                <View key={i} style={s.requirementRow}>
                  <View style={s.bulletDot} />
                  <Text style={s.requirementTxt}>{req}</Text>
                </View>
              ))}
            </View>
          </FadeSection>
        )}

        {/* ── Company Card ── */}
        {!!job.company && (
          <FadeSection delay={260}>
            <View style={[s.section, s.companyCard]}>
              <View style={s.companyIcon}>
                <Text style={s.companyInitial}>{(job.company[0] || 'C').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.companyName}>{job.company}</Text>
                {!!job.location && <Text style={s.companyLoc}>{job.location}</Text>}
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Action Buttons ── */}
        <FadeSection delay={320}>
          <View style={s.actionsBlock}>
            {!isOwner && (
              <ActionBtn
                label="Apply Now"
                icon="briefcase-outline"
                color={ORANGE}
                onPress={applyJob}
              />
            )}
            {!!job.phone && (
              <ActionBtn
                label="Chat on WhatsApp"
                icon="logo-whatsapp"
                color={GREEN}
                onPress={openWhatsApp}
              />
            )}
            <ActionBtn
              label="Share Job"
              icon="share-social-outline"
              outline
              onPress={shareJob}
            />
            {isOwner && (
              <ActionBtn
                label="Delete Job"
                icon="trash-outline"
                color="#ef4444"
                onPress={deleteJob}
              />
            )}
          </View>
        </FadeSection>
      </ScrollView>

      {/* ── Report Modal ── */}
      {showReport && (
        <View style={s.reportOverlay}>
          <View style={s.reportBox}>
            <Text style={s.reportTitle}>Report Listing</Text>
            {['Spam or fake', 'Fraud / scam', 'Inappropriate content', 'Job already filled', 'Other'].map(reason => (
              <TouchableOpacity key={reason} style={s.reportOption} onPress={() => submitReport(reason)}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={s.reportOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowReport(false)}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // ── Hero ──
  hero: {
    backgroundColor: ORANGE,
    paddingHorizontal: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Icon container — white rounded square matching screenshot
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Title block ──
  titleBlock: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title:     { fontSize: 22, fontWeight: '800', color: '#111', flex: 1, marginRight: 10, lineHeight: 28 },
  salaryBig: { fontSize: 15, fontWeight: '800', color: ORANGE, flexShrink: 0, marginTop: 4 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  locationTxt: { fontSize: 13, color: '#888', fontWeight: '500' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f5f5f5', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  infoBadgeTxt: { fontSize: 12, color: '#555', fontWeight: '600' },

  // ── Sections ──
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHead: {
    fontSize: 11, fontWeight: '800', color: '#999',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  descText: { fontSize: 14, lineHeight: 23, color: '#444' },

  // ── Skills ──
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  skillTxt: { fontSize: 12, fontWeight: '600', color: '#333' },

  // ── Requirements ──
  requirementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bulletDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#ccc', marginTop: 8, flexShrink: 0,
  },
  requirementTxt: { fontSize: 14, color: '#444', lineHeight: 22, flex: 1 },

  // ── Company card ──
  companyCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  companyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  companyInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  companyName: { fontSize: 15, fontWeight: '700', color: '#111' },
  companyLoc:  { fontSize: 12, color: '#888', marginTop: 2 },

  // ── Action buttons ──
  actionsBlock: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  actionBtnWrap: {},
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Report modal ──
  reportOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  reportBox:   { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%' },
  reportTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 14, textAlign: 'center' },
  reportOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#f5e5e5', backgroundColor: '#fff5f5', marginBottom: 8,
  },
  reportOptionTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 12 },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: '#999' },
});
