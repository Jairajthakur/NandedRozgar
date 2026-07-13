/**
 * DisputePanel.js — "Instant Dispute Resolution" for escrow-protected hires.
 *
 * If a contractor claims a job isn't finished (and won't release escrow) or
 * a worker feels wrongly refused, either side opens a dispute here and
 * attaches photo proof of the work. The other side can add their own
 * photos/response. An admin makes the final call (a simplified panel, not
 * a full automated arbitration engine) — see src/routes/escrow.js
 * disputes/:id/resolve, used from the admin dashboard.
 *
 * Backend: src/routes/escrow.js, mounted at /api/escrow.
 * Place at: src/components/labour/DisputePanel.js
 *
 * Usage:
 *   <DisputePanel hireRequestId={hr.id} isContractor={hr.contractor_id === user.id} />
 * Only renders itself once escrow exists on the hire (funded/released/refunded)
 * — pass null/omit if this hire has no escrow.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const STATUS_META = {
  open:                 { label: 'Dispute open — awaiting admin review', color: C.warning },
  resolved_worker:      { label: 'Resolved — paid to worker',            color: C.success },
  resolved_contractor:  { label: 'Resolved — refunded to contractor',    color: C.info },
  withdrawn:            { label: 'Withdrawn',                            color: C.textMuted },
};

async function pickAndUploadPhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo access to attach proof.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType || 'image/jpeg';
  const base64Data = `data:${mimeType};base64,${asset.base64}`;
  const res = await http('POST', '/api/upload/image', { image: base64Data, folder: 'cityplus/disputes' });
  if (res?.ok && res.url) return res.url;
  Toast.show({ type: 'error', text1: 'Photo upload failed', text2: res?.error });
  return null;
}

function PhotoStrip({ urls }) {
  if (!urls?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
      {urls.map((u, i) => <Image key={i} source={{ uri: u }} style={st.photo} />)}
    </ScrollView>
  );
}

export default function DisputePanel({ hireRequestId, isContractor = false }) {
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState(null);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', `/api/escrow/${hireRequestId}/dispute`);
    if (res?.ok) setDispute(res.dispute);
    setLoading(false);
  }, [hireRequestId]);

  useEffect(() => { load(); }, [load]);

  const addPhoto = async () => {
    setUploading(true);
    const url = await pickAndUploadPhoto();
    setUploading(false);
    if (url) setPhotos((p) => [...p, url]);
  };

  const submitDispute = async () => {
    if (!reason.trim()) {
      Toast.show({ type: 'error', text1: 'Describe the problem first' });
      return;
    }
    setSubmitting(true);
    const isFirstDispute = !dispute;
    const res = await http(
      'POST',
      isFirstDispute
        ? `/api/escrow/${hireRequestId}/dispute`
        : `/api/escrow/${hireRequestId}/dispute/evidence`,
      { reason: reason.trim(), photoUrls: photos }
    );
    setSubmitting(false);
    if (res?.ok) {
      Toast.show({ type: 'success', text1: isFirstDispute ? 'Dispute opened' : 'Your response was submitted' });
      setReason(''); setPhotos([]); setShowForm(false);
      load();
    } else {
      Toast.show({ type: 'error', text1: 'Could not submit', text2: res?.error });
    }
  };

  if (loading) return <View style={st.card}><ActivityIndicator color={C.primary} /></View>;

  // Nothing to show: no open/past dispute, and the person hasn't started one.
  if (!dispute && !showForm) {
    return (
      <TouchableOpacity style={st.raiseBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
        <Text style={st.raiseBtnTxt}>Something wrong with this job? Raise a dispute</Text>
      </TouchableOpacity>
    );
  }

  const meta = dispute ? STATUS_META[dispute.status] : null;
  // Has the current viewer already had their say? (raised it, or already countered)
  const iAmRaiser = dispute && (isContractor ? dispute.contractor_id === dispute.raised_by : dispute.labourer_user_id === dispute.raised_by);
  const needsMyResponse = dispute?.status === 'open' && !iAmRaiser && !dispute.counter_reason;

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <Ionicons name="alert-circle" size={16} color={C.danger} />
        <Text style={st.title}>Dispute</Text>
      </View>

      {dispute && (
        <>
          <View style={[st.statusPill, { backgroundColor: `${meta.color}18` }]}>
            <Text style={[st.statusTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>

          <Text style={st.label}>{iAmRaiser ? 'Your report' : "Other party's report"}</Text>
          <Text style={st.reasonTxt}>{dispute.reason}</Text>
          <PhotoStrip urls={dispute.photo_urls} />

          {dispute.counter_reason && (
            <>
              <Text style={[st.label, { marginTop: 10 }]}>{iAmRaiser ? "Other party's response" : 'Your response'}</Text>
              <Text style={st.reasonTxt}>{dispute.counter_reason}</Text>
              <PhotoStrip urls={dispute.counter_photo_urls} />
            </>
          )}

          {dispute.resolution_note && (
            <>
              <Text style={[st.label, { marginTop: 10 }]}>Admin decision</Text>
              <Text style={st.reasonTxt}>{dispute.resolution_note}</Text>
            </>
          )}
        </>
      )}

      {(showForm || needsMyResponse) && (
        <View style={{ marginTop: 12 }}>
          <Text style={st.label}>{dispute ? 'Your response' : 'What went wrong?'}</Text>
          <TextInput
            style={st.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Describe what happened…"
            placeholderTextColor={C.textMuted}
            multiline
          />
          <TouchableOpacity style={st.photoBtn} onPress={addPhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color={C.primary} /> : (
              <>
                <Ionicons name="camera-outline" size={15} color={C.primary} />
                <Text style={st.photoBtnTxt}>Add photo proof ({photos.length}/6)</Text>
              </>
            )}
          </TouchableOpacity>
          <PhotoStrip urls={photos} />

          <TouchableOpacity style={st.submitBtn} onPress={submitDispute} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={st.submitBtnTxt}>{dispute ? 'Submit response' : 'Open dispute'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {dispute?.status === 'open' && !showForm && !needsMyResponse && (
        <Text style={st.waitingTxt}>Waiting for admin review. You'll be notified once it's resolved.</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#fecaca',
    padding: SPACING.lg, gap: SPACING.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: C.text },
  raiseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: RADIUS.md, paddingVertical: 10,
  },
  raiseBtnTxt: { fontSize: 12.5, fontWeight: '700', color: C.danger },
  statusPill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS.pill },
  statusTxt: { fontSize: 11.5, fontWeight: '800' },
  label: { fontSize: 11.5, fontWeight: '800', color: C.textMuted, marginTop: 6, textTransform: 'uppercase' },
  reasonTxt: { fontSize: 13, color: C.text, lineHeight: 18, marginTop: 2 },
  photo: { width: 70, height: 70, borderRadius: 8, marginRight: 8, backgroundColor: C.bg },
  input: {
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text,
    minHeight: 70, textAlignVertical: 'top', marginTop: 6,
  },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  photoBtnTxt: { fontSize: 12.5, fontWeight: '700', color: C.primary },
  submitBtn: { backgroundColor: C.danger, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  submitBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  waitingTxt: { fontSize: 11.5, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
});
