import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Linking, Alert, TouchableOpacity, Share,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http, timeAgo } from '../utils/api';
import { Btn, Chip, Card } from '../components/UI';
import { C, CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';

export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob] = useState(initial);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user, role, loadJobs } = useAuth();
  const { t } = useLang();

  const hasApplied = job.applicants?.includes(user?.id);
  const hasSaved   = job.saved?.includes(user?.id);
  const isOwner    = job.posted_by === user?.id || role === 'admin';

  async function applyJob() {
    const r = await http('POST', `/api/jobs/${job.id}/apply`);
    if (r.ok) {
      setJob(j => ({ ...j, applicants: [...(j.applicants || []), user.id] }));
      await loadJobs();
      Toast.show({ type: 'success', text1: '✅ Marked as Applied! Good luck!' });
    }
  }

  async function saveJob() {
    const r = await http('POST', `/api/jobs/${job.id}/save`);
    if (r.ok) {
      await loadJobs();
      Toast.show({ type: 'success', text1: r.saved ? 'Job saved!' : 'Removed from saved' });
    }
  }

  async function deleteJob() {
    Alert.alert(t('deleteJobTitle'), t('areYouSure'), [
      { text: t('cancel') },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        await http('DELETE', `/api/jobs/${job.id}`);
        await loadJobs();
        navigation.goBack();
        Toast.show({ type: 'success', text1: '🗑 Job deleted.' });
      }},
    ]);
  }

  function whatsapp() {
    const phone = (job.phone || '').replace(/\D/g, '');
    const msg   = encodeURIComponent(`Hi, I saw your job posting on NandedRozgar for ${job.title}. I am interested.`);
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareJob() {
    try {
      await Share.share({
        message: `🔥 Job Opening: ${job.title} at ${job.company}\n📍 ${job.location} | 💰 ${job.salary}\n\nApply on NandedRozgar app! Download: https://nandedrozgar.com`,
        title: `${job.title} — NandedRozgar`,
      });
    } catch (e) {
      // User cancelled — no action needed
    }
  }

  async function submitReport(reason) {
    setShowReportModal(false);
    const r = await http('POST', `/api/jobs/${job.id}/report`, { reason });
    Toast.show({ type: 'success', text1: '⚠️ Report submitted. We\'ll review it shortly.' });
  }

  const icon = CAT_ICONS[job.category] || 'briefcase';
  const isVerifiedEmployer = job.verified_employer || false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 12 }}>
        {job.featured && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t('featured')}</Text>
          </View>
        )}
        {job.urgent && (
          <View style={[styles.banner, { backgroundColor: '#f5f5f5', borderColor: '#555' }]}>
            <Text style={[styles.bannerText, { color: '#444' }]}>{t('urgent')}</Text>
          </View>
        )}

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{job.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.company}>{job.company}</Text>
              {isVerifiedEmployer && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={styles.verifiedTxt}>{t('verifiedEmployer')}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={{ fontSize: 36 }}>{icon}</Text>
        </View>

        <View style={styles.chips}>
          <Chip label={job.location} iconName="location-sharp" style={styles.chip} />
          <Chip label={job.salary} iconName="cash" variant="gold" style={styles.chip} />
          <Chip label={`⏰ ${job.type}`}     variant="gray" style={styles.chip} />
          <Chip label={`${icon} ${job.category}`} style={styles.chip} />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionHead}>{t('aboutRole')}</Text>
        <Text style={styles.desc}>{job.description}</Text>

        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <Text style={{ fontSize: 12, color: C.muted }}>
            {t('postedAgo')} {timeAgo(job.timestamp)} · {job.views || 0} {t('views')} · {job.applicant_count || 0} {t('appliedCount')}
          </Text>
        </View>

        {/* Last active indicator */}
        <View style={styles.lastActiveRow}>
          <View style={[styles.lastActiveDot, { backgroundColor: job.timestamp && (Date.now() - job.timestamp) < 86400000 ? '#16a34a' : '#f97316' }]} />
          <Text style={styles.lastActiveTxt}>
            {job.timestamp && (Date.now() - job.timestamp) < 3600000
              ? t('activeJustNow')
              : job.timestamp && (Date.now() - job.timestamp) < 86400000
              ? `${t('activeToday')} · ${t('postedAgo')} ${timeAgo(job.timestamp)}`
              : `${t('postedAgo')} ${timeAgo(job.timestamp)}`}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Share + Report row */}
        <View style={styles.actionRowTop}>
          <TouchableOpacity style={styles.shareBtn} onPress={shareJob}>
            <Ionicons name="share-social-outline" size={15} color="#555" />
            <Text style={styles.shareTxt}>{t('shareJob')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportBtn} onPress={() => setShowReportModal(true)}>
            <Ionicons name="flag-outline" size={15} color="#ef4444" />
            <Text style={styles.reportTxt}>{t('reportListing')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {role === 'seeker' ? (
          <>
            <View style={styles.contactBox}>
              <Text style={styles.contactLabel}>{t('contactEmployer')}</Text>
              <Text style={styles.contactPhone}>{job.phone}</Text>
              <Text style={styles.contactSub}>{t('callFree')}</Text>
            </View>
            <View style={styles.actions}>
              <Btn
                label={hasApplied ? t('applied') : t('markApplied')}
                onPress={applyJob}
                disabled={hasApplied}
                style={{ flex: 1 }}
              />
              <Btn
                label={hasSaved ? t('saved') : t('save')}
                variant="outline"
                onPress={saveJob}
                style={{ flex: 1 }}
              />
            </View>
            <Btn
              label={t('whatsapp')}
              onPress={whatsapp}
              style={{ backgroundColor: '#25d366', marginTop: 8 }}
            />
          </>
        ) : (
          <View style={styles.actions}>
            {isOwner && (
              <Btn label={t('deleteJob')} variant="danger" onPress={deleteJob} style={{ flex: 1 }} />
            )}
          </View>
        )}
      </Card>

      {/* Report Modal */}
      {showReportModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('reportTitle')}</Text>
            {[t('reportSpam'), t('reportFraud'), t('reportInappropriate'), t('jobAlreadyFilled'), t('reportOther')].map(reason => (
              <TouchableOpacity key={reason} style={styles.reportOption} onPress={() => submitReport(reason)}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.reportOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)}>
              <Text style={styles.cancelTxt}>{t('reportCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: {
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#aaa',
    borderRadius: 9, padding: 10, marginBottom: 12,
  },
  bannerText: { fontSize: 12, fontWeight: '600', color: '#555' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 3 },
  company: { fontSize: 14, color: C.muted, fontWeight: '500' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 7 },
  verifiedTxt: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { marginBottom: 4 },
  divider: { height: 1.5, backgroundColor: C.border, marginVertical: 14 },
  sectionHead: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 22, color: '#333' },
  metaRow: { alignItems: 'center' },
  lastActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  lastActiveDot: { width: 7, height: 7, borderRadius: 4 },
  lastActiveTxt: { fontSize: 11, color: '#666', fontWeight: '500' },
  actionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  shareTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  reportTxt: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  contactBox: {
    backgroundColor: C.grayLight, borderWidth: 1.5, borderColor: '#ccc',
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  contactLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  contactPhone: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  contactSub:   { fontSize: 11, color: C.muted, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  // Report Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 14, textAlign: 'center' },
  reportOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f5e5e5', backgroundColor: '#fff5f5', marginBottom: 8 },
  reportOptionTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 12 },
  cancelTxt: { fontSize: 13, fontWeight: '600', color: '#999' },
});
