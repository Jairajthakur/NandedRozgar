import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Alert, TouchableOpacity, Share } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { Btn, Card } from '../components/UI';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';
import GeometricBg from '../components/GeometricBg';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

function InfoRow({ icon, label, value, accent = ORANGE }) {
  if (!value) return null;
  return (
    <View style={ir.row}>
      <View style={[ir.iconWrap, { backgroundColor: accent + '18', borderColor: accent + '25' }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob] = useState(initial);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user, role, loadJobs } = useAuth();
  const { t } = useLang();

  const applicants = job.applicant_count || 0;
  const isOwner    = job.posted_by === user?.id || role === 'admin';
  const icon       = CAT_ICONS[job.category] || 'briefcase-outline';
  const createdAt  = job.created_at ? new Date(job.created_at) : null;
  const createdStr = createdAt ? createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const ageDays    = createdAt ? (Date.now() - createdAt.getTime()) / 86400000 : 99;
  const isNew      = ageDays < 1;
  const dotColor   = isNew ? '#4ade80' : ageDays < 7 ? ORANGE : 'rgba(255,255,255,0.25)';
  const dotLabel   = isNew ? 'Posted today' : ageDays < 7 ? `Posted ${Math.floor(ageDays)}d ago` : createdStr ? `Posted on ${createdStr}` : '';

  const accentColor = job.featured ? ORANGE : job.urgent ? '#ef4444' : INDIGO;

  async function applyJob() {
    const r = await http('POST', `/api/jobs/${job.id}/apply`);
    if (r.ok) {
      setJob(j => ({ ...j, applicant_count: (j.applicant_count || 0) + 1 }));
      await loadJobs();
      Toast.show({ type: 'success', text1: 'Marked as Applied! Good luck!' });
    }
  }
  async function deleteJob() {
    Alert.alert('Delete Job', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await http('DELETE', `/api/jobs/${job.id}`);
        await loadJobs();
        navigation.goBack();
        Toast.show({ type: 'success', text1: 'Job deleted.' });
      }},
    ]);
  }
  function callEmployer() { if (job.phone) Linking.openURL(`tel:${job.phone}`); }
  function whatsapp() {
    const phone = (job.phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi, I saw your job posting on NandedRozgar for ${job.title}. I am interested.`);
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }
  async function shareJob() {
    try {
      await Share.share({ message: `Job: ${job.title}${job.company ? ` at ${job.company}` : ''}\n${job.location || ''}${job.salary ? ` | ${job.salary}` : ''}\n\nApply on NandedRozgar!` });
    } catch {}
  }
  async function submitReport(reason) {
    setShowReportModal(false);
    await http('POST', `/api/jobs/${job.id}/report`, { reason });
    Toast.show({ type: 'success', text1: "Report submitted. We'll review it shortly." });
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>

      {/* ── Hero Header Card ── */}
      <View style={[s.heroCard, { borderColor: accentColor + '35' }]}>
        <GeometricBg />
        {/* Top glow line */}
        <View style={[s.heroGlow, { backgroundColor: accentColor }]} />

        {/* Badges */}
        {job.featured && (
          <View style={[s.heroBadge, { backgroundColor: ORANGE + '20', borderColor: ORANGE + '50' }]}>
            <Ionicons name="star" size={11} color={ORANGE} />
            <Text style={[s.heroBadgeTxt, { color: ORANGE }]}>Featured Listing</Text>
          </View>
        )}
        {job.urgent && (
          <View style={[s.heroBadge, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]}>
            <Ionicons name="flame" size={11} color="#ef4444" />
            <Text style={[s.heroBadgeTxt, { color: '#ef4444' }]}>Urgent Hiring</Text>
          </View>
        )}

        {/* Title + icon */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{job.title}</Text>
            {!!job.company && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={s.company}>{job.company}</Text>
                {job.verified_employer && <Ionicons name="checkmark-circle" size={13} color="#4ade80" />}
              </View>
            )}
          </View>
          <View style={[s.iconCircle, { backgroundColor: accentColor + '20', borderColor: accentColor + '50' }]}>
            <Ionicons name={icon} size={26} color={accentColor} />
          </View>
        </View>

        {/* Date indicator */}
        <View style={s.dotRow}>
          <View style={[s.dot, { backgroundColor: dotColor }]} />
          <Text style={[s.dotLabel, { color: dotColor }]}>{dotLabel}</Text>
        </View>

        {/* Salary pill */}
        {!!job.salary && (
          <View style={[s.salaryPill, { backgroundColor: accentColor, shadowColor: accentColor }]}>
            <Ionicons name="cash-outline" size={13} color="#fff" />
            <Text style={s.salaryTxt}>{job.salary} / month</Text>
          </View>
        )}
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        {[
          { icon: 'eye-outline', val: job.views || 0, label: 'Views', color: INDIGO },
          { icon: 'people-outline', val: applicants, label: 'Applied', color: ORANGE },
          { icon: 'time-outline', val: isNew ? 'NEW' : `${Math.floor(ageDays)}d`, label: isNew ? 'Just posted' : 'Age', color: dotColor },
        ].map((st, i) => (
          <View key={i} style={[s.statBox, { borderColor: st.color + '25' }]}>
            <View style={[s.statIconWrap, { backgroundColor: st.color + '15' }]}>
              <Ionicons name={st.icon} size={16} color={st.color} />
            </View>
            <Text style={[s.statNum, { color: st.color }]}>{st.val}</Text>
            <Text style={s.statLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Details Card ── */}
      <Card style={s.detailCard}>
        <Text style={s.sectionHead}>Job Details</Text>
        <InfoRow icon="location-sharp" label="Location" value={job.location} accent={ORANGE} />
        <InfoRow icon="briefcase-outline" label="Job Type" value={job.type} accent={INDIGO} />
        <InfoRow icon="grid-outline" label="Category" value={job.category} accent={CYAN} />
        <InfoRow icon="time-outline" label="Expires" value={job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} accent={ORANGE} />
        <InfoRow icon="person-outline" label="Posted by" value={job.poster_name || job.poster_company || null} accent={INDIGO} />
      </Card>

      {/* ── Description ── */}
      {!!job.description && (
        <Card style={s.detailCard}>
          <Text style={s.sectionHead}>About the Role</Text>
          <Text style={s.desc}>{job.description}</Text>
        </Card>
      )}

      {/* ── Contact Card ── */}
      {!!job.phone && (
        <View style={[s.contactCard, { borderColor: ORANGE + '25' }]}>
          <View style={s.contactGlow} />
          <Text style={s.sectionHead}>Contact Employer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <View style={[s.phoneIcon, { backgroundColor: ORANGE + '18' }]}>
              <Ionicons name="call-outline" size={16} color={ORANGE} />
            </View>
            <Text style={s.phone}>{job.phone}</Text>
          </View>
          <Text style={s.contactSub}>Call or WhatsApp directly — it's free</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={[s.contactBtn, { backgroundColor: ORANGE, shadowColor: ORANGE }]} onPress={callEmployer}>
              <Ionicons name="call" size={15} color="#fff" />
              <Text style={s.contactBtnTxt}>Call Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#25d366', shadowColor: '#25d366' }]} onPress={whatsapp}>
              <Ionicons name="logo-whatsapp" size={15} color="#fff" />
              <Text style={s.contactBtnTxt}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Actions Card ── */}
      <Card style={s.detailCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity style={s.actionBtn} onPress={shareJob}>
            <Ionicons name="share-social-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={s.actionBtnTxt}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowReportModal(true)}>
            <Ionicons name="flag-outline" size={14} color="#f87171" />
            <Text style={[s.actionBtnTxt, { color: '#f87171' }]}>Report</Text>
          </TouchableOpacity>
        </View>
        {!isOwner && <Btn label="Mark as Applied" onPress={applyJob} variant="orange" />}
        {isOwner  && <Btn label="Delete Job" variant="danger" onPress={deleteJob} />}
      </Card>

      {/* ── Report Modal ── */}
      {showReportModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalShine} />
            <Text style={s.modalTitle}>Report Listing</Text>
            {['Spam or fake', 'Fraud / scam', 'Inappropriate content', 'Job already filled', 'Other'].map(reason => (
              <TouchableOpacity key={reason} style={s.reportOption} onPress={() => submitReport(reason)}>
                <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
                <Text style={s.reportOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowReportModal(false)}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  iconWrap: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 14, color: '#fff', fontWeight: '600', marginTop: 2 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080812' },
  heroCard: { borderRadius: 20, borderWidth: 1.5, padding: 18, marginBottom: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  heroGlow: { position: 'absolute', top: 0, left: 40, right: 40, height: 2, borderRadius: 1, opacity: 0.6 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 14 },
  heroBadgeTxt: { fontSize: 12, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 30, letterSpacing: 0.2 },
  company: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  iconCircle: { width: 56, height: 56, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotLabel: { fontSize: 12, fontWeight: '600' },
  salaryPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  salaryTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailCard: { marginBottom: 12 },
  sectionHead: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  desc: { fontSize: 14, lineHeight: 24, color: 'rgba(255,255,255,0.7)' },
  contactCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 12, overflow: 'hidden', backgroundColor: 'rgba(249,115,22,0.06)' },
  contactGlow: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: ORANGE + '40' },
  phoneIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  phone: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  contactSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 13, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  contactBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBox: { backgroundColor: '#0e0e1c', borderRadius: 20, padding: 22, width: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  modalShine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },
  reportOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.06)', marginBottom: 8 },
  reportOptionTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 12 },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
});
