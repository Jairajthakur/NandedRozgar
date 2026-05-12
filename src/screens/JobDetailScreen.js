import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Linking, Alert, TouchableOpacity,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http, timeAgo } from '../utils/api';
import { Btn, Chip, Card } from '../components/UI';
import { C, CAT_ICONS } from '../utils/constants';

export default function JobDetailScreen({ route, navigation }) {
  const { job: initial } = route.params;
  const [job, setJob] = useState(initial);
  const { user, role, loadJobs } = useAuth();

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
      Toast.show({ type: 'success', text1: r.saved ? '🔖 Job saved!' : '🔖 Removed from saved' });
    }
  }

  async function deleteJob() {
    Alert.alert('Delete Job', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
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

  const icon = CAT_ICONS[job.category] || '💼';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 12 }}>
        {job.featured && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>⭐ Featured Listing — Top Placement</Text>
          </View>
        )}
        {job.urgent && (
          <View style={[styles.banner, { backgroundColor: '#f5f5f5', borderColor: '#555' }]}>
            <Text style={[styles.bannerText, { color: '#444' }]}>🔥 Urgent Hiring — Apply Immediately</Text>
          </View>
        )}

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.company}>{job.company}</Text>
          </View>
          <Text style={{ fontSize: 36 }}>{icon}</Text>
        </View>

        <View style={styles.chips}>
          <Chip label={`📍 ${job.location}`} style={styles.chip} />
          <Chip label={`💰 ${job.salary}`}   variant="gold" style={styles.chip} />
          <Chip label={`⏰ ${job.type}`}     variant="gray" style={styles.chip} />
          <Chip label={`${icon} ${job.category}`} style={styles.chip} />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionHead}>About the Role</Text>
        <Text style={styles.desc}>{job.description}</Text>

        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <Text style={{ fontSize: 12, color: C.muted }}>
            Posted {timeAgo(job.timestamp)} · 👁 {job.views || 0} views · 👤 {job.applicant_count || 0} applied
          </Text>
        </View>

        <View style={styles.divider} />

        {role === 'seeker' ? (
          <>
            <View style={styles.contactBox}>
              <Text style={styles.contactLabel}>📱 Contact Employer</Text>
              <Text style={styles.contactPhone}>{job.phone}</Text>
              <Text style={styles.contactSub}>Call or WhatsApp — It's FREE for you!</Text>
            </View>
            <View style={styles.actions}>
              <Btn
                label={hasApplied ? '✅ Applied' : '✅ Mark Applied'}
                onPress={applyJob}
                disabled={hasApplied}
                style={{ flex: 1 }}
              />
              <Btn
                label={hasSaved ? '🔖 Saved' : '🔖 Save'}
                variant="outline"
                onPress={saveJob}
                style={{ flex: 1 }}
              />
            </View>
            <Btn
              label="💬 WhatsApp"
              onPress={whatsapp}
              style={{ backgroundColor: '#25d366', marginTop: 8 }}
            />
          </>
        ) : (
          <View style={styles.actions}>
            {isOwner && (
              <Btn label="🗑 Delete Job" variant="danger" onPress={deleteJob} style={{ flex: 1 }} />
            )}
          </View>
        )}
      </Card>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { marginBottom: 4 },
  divider: { height: 1.5, backgroundColor: C.border, marginVertical: 14 },
  sectionHead: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 22, color: '#333' },
  metaRow: { alignItems: 'center' },
  contactBox: {
    backgroundColor: C.grayLight, borderWidth: 1.5, borderColor: '#ccc',
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  contactLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  contactPhone: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  contactSub:   { fontSize: 11, color: C.muted, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8 },
});
