import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Alert, TouchableOpacity, Share, Animated, Easing } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { Btn, Card } from '../components/UI';
import { C, CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';

// ── Animated card entry ───────────────────────────────────────────────────────
function AnimCard({ children, delay = 0, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// ── Animated apply button ─────────────────────────────────────────────────────
function AnimatedApplyBtn({ onPress, label, color = ORANGE, icon }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={press} activeOpacity={1}>
        {icon && <Ionicons name={icon} size={18} color="#fff" />}
        <Text style={styles.actionBtnTxt}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Stat box with count-up ────────────────────────────────────────────────────
function StatBox({ value, label, color = '#111', suffix = '' }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(typeof value === 'number' ? 0 : value);
  useEffect(() => {
    if (typeof value === 'number') {
      Animated.timing(anim, { toValue: value, duration: 800, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
      return () => anim.removeListener(id);
    }
  }, [value]);
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statNum, { color }]}>{typeof value === 'number' ? display + suffix : value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob] = useState(initial);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user, role, loadJobs } = useAuth();
  const { t } = useLang();

  const applicants  = job.applicant_count || 0;
  const isOwner     = job.posted_by === user?.id || role === 'admin';
  const icon        = CAT_ICONS[job.category] || 'briefcase-outline';
  const createdAt   = job.created_at ? new Date(job.created_at) : null;
  const createdStr  = createdAt ? createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const ageDays     = createdAt ? (Date.now() - createdAt.getTime()) / 86400000 : 99;
  const isNew       = ageDays < 1;
  const dotColor    = isNew ? '#16a34a' : ageDays < 7 ? ORANGE : '#bbb';
  const dotLabel    = isNew ? 'Posted today' : ageDays < 7 ? `Posted ${Math.floor(ageDays)}d ago` : createdStr ? `Posted on ${createdStr}` : '';

  // Header icon bounce
  const iconScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(iconScale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true, delay: 100 }).start();
  }, []);

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

  function whatsapp() {
    const phone = (job.phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi, I saw your job posting on NandedRozgar for ${job.title}. I am interested.`);
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareJob() {
    try { await Share.share({ message: `Job Opening: ${job.title}${job.company ? ` at ${job.company}` : ''}\n\nApply on NandedRozgar!` }); } catch {}
  }

  async function submitReport(reason) {
    setShowReportModal(false);
    await http('POST', `/api/jobs/${job.id}/report`, { reason });
    Toast.show({ type: 'success', text1: "Report submitted." });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* ── Header card ── */}
      <AnimCard delay={0}>
        <Card style={{ marginBottom: 12 }}>
          {job.featured && (
            <View style={[styles.banner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <Ionicons name="star" size={13} color={ORANGE} />
              <Text style={[styles.bannerText, { color: ORANGE }]}>  Featured Listing</Text>
            </View>
          )}
          {job.urgent && (
            <View style={[styles.banner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Ionicons name="flame" size={13} color="#dc2626" />
              <Text style={[styles.bannerText, { color: '#dc2626' }]}>  Urgent Hiring</Text>
            </View>
          )}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{job.title}</Text>
              {!!job.company && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <Ionicons name="business-outline" size={13} color="#888" />
                  <Text style={styles.company}>{job.company}</Text>
                </View>
              )}
            </View>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: iconScale }] }]}>
              <Ionicons name={icon} size={26} color={ORANGE} />
            </Animated.View>
          </View>
          <View style={styles.dotRow}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.dotLabel, { color: dotColor }]}>{dotLabel}</Text>
          </View>
        </Card>
      </AnimCard>

      {/* ── Details card ── */}
      <AnimCard delay={80}>
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.sectionHead}>Job Details</Text>
          <InfoRow icon="location-sharp"   label="Location" value={job.location} />
          <InfoRow icon="cash-outline"      label="Salary"   value={job.salary ? `Rs. ${job.salary} / month` : null} />
          <InfoRow icon="briefcase-outline" label="Job Type" value={job.type} />
          <InfoRow icon="grid-outline"      label="Category" value={job.category} />
          <InfoRow icon="time-outline"      label="Expires"  value={job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          <InfoRow icon="person-outline"    label="Posted by" value={job.poster_name || job.poster_company || null} />
        </Card>
      </AnimCard>

      {/* ── Stats card ── */}
      <AnimCard delay={160}>
        <Card style={{ marginBottom: 12 }}>
          <View style={styles.statsRow}>
            <StatBox value={job.views || 0} label="Views" />
            <View style={styles.statDivider} />
            <StatBox value={applicants} label="Applied" color={ORANGE} />
            <View style={styles.statDivider} />
            <StatBox value={isNew ? 'NEW' : `${Math.floor(ageDays)}d`} label={isNew ? 'Just posted' : 'Old'} color={isNew ? '#16a34a' : '#bbb'} />
          </View>
        </Card>
      </AnimCard>

      {/* ── Description ── */}
      {!!job.description && (
        <AnimCard delay={240}>
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.sectionHead}>About the Role</Text>
            <Text style={styles.desc}>{job.description}</Text>
          </Card>
        </AnimCard>
      )}

      {/* ── Contact card ── */}
      {!!job.phone && (
        <AnimCard delay={320}>
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.sectionHead}>Contact Employer</Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={18} color={ORANGE} />
              <Text style={styles.phone}>{job.phone}</Text>
            </View>
            <Text style={styles.contactSub}>Call or WhatsApp directly — it's free</Text>
            <View style={styles.contactBtns}>
              <AnimatedApplyBtn onPress={() => Linking.openURL(`tel:${job.phone}`)} label="Call Now" color={ORANGE} icon="call" />
              <AnimatedApplyBtn onPress={whatsapp} label="WhatsApp" color="#25d366" icon="logo-whatsapp" />
            </View>
          </Card>
        </AnimCard>
      )}

      {/* ── Actions ── */}
      <AnimCard delay={400}>
        <Card style={{ marginBottom: 12 }}>
          <View style={styles.actionRowTop}>
            <TouchableOpacity style={styles.shareBtn} onPress={shareJob}>
              <Ionicons name="share-social-outline" size={15} color="#555" />
              <Text style={styles.shareTxt}>Share Job</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportBtn} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={15} color="#ef4444" />
              <Text style={styles.reportTxt}>Report Listing</Text>
            </TouchableOpacity>
          </View>
          {!isOwner && <Btn label="Mark as Applied" onPress={applyJob} style={{ marginTop: 12 }} />}
          {isOwner  && <Btn label="Delete Job" variant="danger" onPress={deleteJob} style={{ marginTop: 12 }} />}
        </Card>
      </AnimCard>

      {/* Report Modal */}
      {showReportModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Report Listing</Text>
            {['Spam or fake', 'Fraud / scam', 'Inappropriate content', 'Job already filled', 'Other'].map(reason => (
              <TouchableOpacity key={reason} style={styles.reportOption} onPress={() => submitReport(reason)}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.reportOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}><Ionicons name={icon} size={15} color={ORANGE} /></View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  label: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, color: '#111', fontWeight: '600', marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 9, padding: 10, marginBottom: 12 },
  bannerText: { fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', lineHeight: 28 },
  company: { fontSize: 14, color: '#666', fontWeight: '500' },
  iconCircle: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fed7aa', marginLeft: 10 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotLabel: { fontSize: 12, fontWeight: '600' },
  sectionHead: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#111' },
  statLbl: { fontSize: 10, color: '#aaa', fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#ebebeb' },
  desc: { fontSize: 14, lineHeight: 23, color: '#333' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  phone: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: 0.5 },
  contactSub: { fontSize: 12, color: '#888', marginBottom: 12 },
  contactBtns: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, paddingVertical: 12 },
  actionBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  shareTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  reportTxt: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 14, textAlign: 'center' },
  reportOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f5e5e5', backgroundColor: '#fff5f5', marginBottom: 8 },
  reportOptionTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 12 },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: '#999' },
});
