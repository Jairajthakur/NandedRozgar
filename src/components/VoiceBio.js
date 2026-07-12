/**
 * VoiceBio.js — Multi-Language Audio/Voice Profile
 *
 * Many local daily-wage laborers face literacy challenges or struggle to
 * type out a clean text profile. This lets a worker tap a button and record
 * a short spoken intro instead — e.g. "My name is Ramesh, I am a plastering
 * mistri with 10 years of experience in Nanded town." — in whichever
 * language they're comfortable speaking.
 *
 * Recording uses expo-av (added to package.json). The recorded file is
 * uploaded through the existing POST /api/upload pipeline (same one used for
 * profile photos), and the returned URL is saved via
 * PATCH /api/labour/:id/voice-bio.
 *
 * Place at: src/components/VoiceBio.js
 *
 * Usage (on PostLabourProfileScreen, after a profile exists):
 *   <VoiceBio labourId={profile.id} existingUrl={profile.voice_bio_url} editable />
 *
 * Usage (read-only, on LabourDetailScreen):
 *   <VoiceBio existingUrl={profile.voice_bio_url} durationSec={profile.voice_bio_duration_sec} />
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';

import { http, getToken } from '../utils/api';
import { BASE_URL } from '../utils/constants';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../constants/labourTheme';

const MAX_SECONDS = 30;

const LANGUAGES = [
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

export default function VoiceBio({ labourId, existingUrl, durationSec, editable = false, onSaved }) {
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localUri, setLocalUri] = useState(null);
  const [lang, setLang] = useState('mr');
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      recording?.stopAndUnloadAsync().catch(() => {});
      sound?.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      setPermissionGranted(perm.status === 'granted');
      if (perm.status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Microphone permission is needed to record a voice bio' });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not start recording' });
    }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setLocalUri(uri);
    } catch {
      // ignore — recording may have already been unloaded
    } finally {
      setRecording(null);
    }
  };

  const playPreview = async (uri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      setSound(s);
      setIsPlaying(true);
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setIsPlaying(false);
      });
      await s.playAsync();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not play recording' });
    }
  };

  const discardLocal = () => {
    setLocalUri(null);
    setElapsed(0);
  };

  const uploadAndSave = async () => {
    if (!localUri || !labourId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('file', { uri: localUri, name: 'voice-bio.m4a', type: 'audio/m4a' });
      form.append('folder', 'voice-bios');

      const uploadRes = await fetch(`${BASE_URL}/api/upload/audio`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : undefined, 'Content-Type': 'multipart/form-data' },
        body: form,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      const saveRes = await http('PATCH', `/api/labour/${labourId}/voice-bio`, {
        voiceBioUrl: uploadData.url,
        durationSec: elapsed,
        lang,
      });
      if (!saveRes.ok) throw new Error(saveRes.error || 'Could not save voice bio');

      Toast.show({ type: 'success', text1: 'Voice bio saved 🎙️' });
      setLocalUri(null);
      onSaved?.(saveRes.profile);
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Failed to save voice bio' });
    } finally {
      setSaving(false);
    }
  };

  const removeVoiceBio = async () => {
    if (!labourId) return;
    const res = await http('DELETE', `/api/labour/${labourId}/voice-bio`);
    if (res.ok) {
      Toast.show({ type: 'success', text1: 'Voice bio removed' });
      onSaved?.(res.profile);
    }
  };

  // ── Read-only mode: just a play button for an existing recording ─────────
  if (!editable) {
    if (!existingUrl) return null;
    return (
      <TouchableOpacity style={st.playCard} onPress={() => playPreview(existingUrl)}>
        <View style={st.playIconWrap}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.playTitle}>Voice introduction</Text>
          <Text style={st.playSub}>{durationSec ? `${durationSec}s` : 'Tap to listen'}</Text>
        </View>
        <Ionicons name="volume-high-outline" size={16} color={C.textMuted} />
      </TouchableOpacity>
    );
  }

  // ── Editable mode: record / preview / save ────────────────────────────────
  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <Ionicons name="mic-outline" size={16} color={C.primary} />
        <Text style={st.title}>Voice bio (up to {MAX_SECONDS}s)</Text>
      </View>
      <Text style={st.hint}>
        Speak your name, trade, and years of experience — helpful if typing isn't easy.
      </Text>

      <View style={st.langRow}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[st.langChip, lang === l.code && st.langChipActive]}
            onPress={() => setLang(l.code)}
          >
            <Text style={[st.langTxt, lang === l.code && st.langTxtActive]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {existingUrl && !localUri && (
        <TouchableOpacity style={st.playCard} onPress={() => playPreview(existingUrl)}>
          <View style={st.playIconWrap}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.playTitle}>Current voice bio</Text>
            <Text style={st.playSub}>{durationSec ? `${durationSec}s` : ''}</Text>
          </View>
          <TouchableOpacity onPress={removeVoiceBio} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={C.danger} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {localUri ? (
        <View style={st.previewRow}>
          <TouchableOpacity style={st.playCard2} onPress={() => playPreview(localUri)}>
            <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={22} color={C.primary} />
            <Text style={st.previewTxt}>New recording · {elapsed}s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.smallBtn} onPress={discardLocal}>
            <Ionicons name="close" size={16} color={C.danger} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.smallBtn, st.saveBtn]} onPress={uploadAndSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[st.recordBtn, isRecording && st.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons name={isRecording ? 'stop-circle' : 'mic'} size={20} color="#fff" />
          <Text style={st.recordTxt}>
            {isRecording ? `Recording… ${elapsed}s (tap to stop)` : 'Tap to record'}
          </Text>
        </TouchableOpacity>
      )}

      {permissionGranted === false && (
        <Text style={st.permWarn}>Microphone permission was denied — enable it in your phone's app settings.</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border,
    padding: SPACING.lg, gap: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  hint: { fontSize: 12, color: C.textMuted },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  langChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  langTxt: { fontSize: 12.5, color: C.text, fontWeight: '600' },
  langTxtActive: { color: '#fff' },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: RADIUS.md, paddingVertical: 12,
  },
  recordBtnActive: { backgroundColor: C.danger },
  recordTxt: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  playCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.bg, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  playIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  playTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  playSub: { fontSize: 11.5, color: C.textMuted, marginTop: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  playCard2: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: RADIUS.md, padding: SPACING.md },
  previewTxt: { fontSize: 12.5, color: C.text, fontWeight: '600' },
  smallBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dangerBg },
  saveBtn: { backgroundColor: C.success },
  permWarn: { fontSize: 11.5, color: C.danger },
});
