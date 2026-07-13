/**
 * BulkHireModal.js — confirm & send hire requests to several ad-hoc
 * selected workers at once (POST /api/labour/hire-bulk).
 *
 * Unlike a pre-formed Crew (workers a lead organizes ahead of time), this
 * is for a contractor who just picked N individual workers off the browse
 * screen. Any of them not already contact-unlocked get a 1-day unlock
 * charged automatically as part of the same request — the modal shows
 * that estimated cost upfront so it's never a surprise deduction.
 *
 * Place at: src/components/labour/BulkHireModal.js
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { http } from '../../utils/api';
import { LABOUR_COLORS } from '../../constants/labourTheme';

const ORANGE = LABOUR_COLORS.primary;
const UNLOCK_RATE_PER_DAY = 10; // must match CONTACT_RATE_PER_DAY on the backend — display only

export default function BulkHireModal({ visible, workers, onClose, onSuccess }) {
  const [workDescription, setWorkDescription] = useState('');
  const [proposedWage, setProposedWage]       = useState('');
  const [workDate, setWorkDate]               = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState(null);

  const reset = () => {
    setWorkDescription(''); setProposedWage(''); setWorkDate(''); setError(null);
  };

  const handleClose = () => { if (!submitting) { reset(); onClose?.(); } };

  const submit = async () => {
    if (!workers?.length) return;
    setSubmitting(true);
    setError(null);
    const res = await http('POST', '/api/labour/hire-bulk', {
      labourIds: workers.map(w => w.id),
      work_description: workDescription.trim() || null,
      proposed_wage: proposedWage ? parseInt(proposedWage, 10) : null,
      work_date: workDate.trim() || null,
    });
    setSubmitting(false);

    if (res?.ok) {
      const sentCount = res.hireRequests?.length || 0;
      Toast.show({
        type: 'success',
        text1: `Hire request${sentCount === 1 ? '' : 's'} sent to ${sentCount} worker${sentCount === 1 ? '' : 's'}`,
        text2: res.unlocksCharged ? `₹${res.totalUnlockCost} charged for new contact unlocks` : undefined,
      });
      reset();
      onSuccess?.(res);
    } else {
      setError(res?.error || 'Could not send hire requests. Please try again.');
    }
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.title}>Hire {workers?.length || 0} worker{workers?.length === 1 ? '' : 's'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {workers?.map(w => (
              <View key={w.id} style={s.workerRow}>
                {w.photo_url ? (
                  <Image source={{ uri: w.photo_url }} style={s.workerPhoto} />
                ) : (
                  <View style={[s.workerPhoto, s.workerPhotoFallback]}>
                    <Ionicons name="person" size={16} color="#999" />
                  </View>
                )}
                <Text style={s.workerName} numberOfLines={1}>{w.full_name}</Text>
                <Text style={s.workerSkill} numberOfLines={1}>{w.skill_category}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.costNote}>
            <Ionicons name="information-circle" size={15} color="#b45309" />
            <Text style={s.costNoteTxt}>
              Any of these workers whose contact you haven't already unlocked will be unlocked automatically (₹{UNLOCK_RATE_PER_DAY}/day each) as part of sending these requests. You'll see the exact amount charged in the confirmation.
            </Text>
          </View>

          <Text style={s.label}>Work description (optional, applies to all)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Wall plastering, 2 rooms"
            placeholderTextColor="#aaa"
            value={workDescription}
            onChangeText={setWorkDescription}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Wage per worker (₹/day)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 600"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                value={proposedWage}
                onChangeText={setProposedWage}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Work date</Text>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#aaa"
                value={workDate}
                onChangeText={setWorkDate}
              />
            </View>
          </View>

          {!!error && <Text style={s.errorTxt}>{error}</Text>}

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={submit}
            disabled={submitting || !workers?.length}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.submitBtnTxt}>Send {workers?.length || 0} hire request{workers?.length === 1 ? '' : 's'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 10, paddingBottom: 28, paddingHorizontal: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5', alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#111' },

  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  workerPhoto: { width: 30, height: 30, borderRadius: 15 },
  workerPhotoFallback: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: 13, fontWeight: '700', color: '#222', flex: 1 },
  workerSkill: { fontSize: 11.5, color: '#999' },

  costNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 4,
  },
  costNoteTxt: { flex: 1, fontSize: 11.5, color: '#92400e', lineHeight: 16 },

  label: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: '#111',
  },
  errorTxt: { color: '#dc2626', fontSize: 12.5, marginTop: 10 },

  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  submitBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
