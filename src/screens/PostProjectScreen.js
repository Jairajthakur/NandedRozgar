/**
 * PostProjectScreen.js — "Post a Project" form for contractors.
 *
 * A project is a fixed-slot posting — "10 Mason helpers needed, ₹500/day,
 * 5 days" — that workers browse and instantly apply to (see ProjectsScreen /
 * ProjectDetailScreen), unlike a single hire which goes through the normal
 * request → accept flow.
 *
 * Submission is WhatsApp-mediated, not instant: the contractor fills this
 * form, and instead of posting straight to POST /api/projects (which would
 * make it live immediately), we open WhatsApp with all the details
 * pre-filled and addressed to the CityPlus team. The team prices the
 * project, sends a payment QR over WhatsApp, and only after payment posts
 * it live themselves — same manual-review pattern as PromoteBusinessScreen's
 * WhatsApp banner-request flow. No project row is created from this screen.
 *
 * Place at: src/screens/PostProjectScreen.js
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Linking, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { LABOUR_COLORS, SKILL_ICONS } from '../constants/labourTheme';
import { SectionCard, StepHeader } from '../components/labour/LabourUI';

const ORANGE = LABOUR_COLORS.primary;
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper', 'Other'];

// Same CityPlus support number used elsewhere (HelpSupportScreen, PromoteBusinessScreen).
const WHATSAPP_NUMBER = '919834308805';

export default function PostProjectScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentDistrict } = useDistrict();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillCategory, setSkillCategory] = useState('Mason');
  const [location, setLocation] = useState('');
  const [workersNeeded, setWorkersNeeded] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [budget, setBudget] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  const needed = parseInt(workersNeeded, 10) || 0;
  const wage = parseInt(dailyWage, 10) || 0;
  const duration = parseInt(durationDays, 10) || 0;
  const autoBudget = needed && wage && duration ? needed * wage * duration : null;

  const handleSubmit = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a project title', text2: 'e.g. "10 Mason helpers — Shivaji Nagar site"' });
      return;
    }
    if (needed < 1) {
      Toast.show({ type: 'error', text1: 'How many workers do you need?', text2: 'Enter at least 1.' });
      return;
    }
    if (!contactPhone.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a contact number', text2: 'So our team can reach you on WhatsApp.' });
      return;
    }

    const lines = [
      `🏗️ *New Project Request — CityPlus*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `*📌 Title:* ${title.trim()}`,
      `*🛠️ Trade needed:* ${skillCategory}`,
      `*👷 Workers needed:* ${needed}`,
      `*💰 Daily wage:* ${wage ? `₹${wage}` : '—'}`,
      `*📅 Duration:* ${duration ? `${duration} days` : '—'}`,
      `*🧮 Estimated budget:* ${budget ? `₹${budget}` : autoBudget ? `₹${autoBudget} (auto)` : '—'}`,
      `*📍 Location:* ${location.trim() || '—'}`,
      `*🏙️ District:* ${currentDistrict?.name || '—'}`,
      `*📞 Contact number:* ${contactPhone.trim()}`,
      ``,
      `*📝 Description:*`,
      description.trim() || '—',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Please quote a price for this project and share the payment QR. I'll confirm once paid. Thank you! 🙏`,
    ];
    const msg = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

    Linking.openURL(url)
      .then(() => {
        Toast.show({ type: 'success', text1: 'Opening WhatsApp…', text2: 'Our team will quote a price and share a payment QR.' });
        nav.goBack();
      })
      .catch(() => {
        Alert.alert('WhatsApp not found', 'Please install WhatsApp or contact us directly.');
      });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Post a Project</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <SectionCard>
            <StepHeader number={1} title="What's the job" subtitle="Workers see this when browsing" />

            <View style={s.field}>
              <Text style={s.label}>Project title *</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. 10 Mason helpers — Shivaji Nagar Bungalow"
                placeholderTextColor="#bbb"
                maxLength={150}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Trade needed *</Text>
              <View style={s.skillGrid}>
                {SKILLS.map(sk => {
                  const active = skillCategory === sk;
                  return (
                    <TouchableOpacity
                      key={sk}
                      onPress={() => setSkillCategory(sk)}
                      style={[s.skillChip, active && s.skillChipActive]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={SKILL_ICONS[sk] || 'briefcase-outline'} size={14} color={active ? '#fff' : ORANGE} />
                      <Text style={[s.skillChipTxt, active && s.skillChipTxtActive]}>{sk}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Description (optional)</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Site details, timing, tools to bring, etc."
                placeholderTextColor="#bbb"
                multiline
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Site location (optional)</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Shivaji Nagar, near water tank"
                placeholderTextColor="#bbb"
              />
              <Text style={s.hint}>District is set to {currentDistrict?.name || 'your current district'}.</Text>
            </View>
          </SectionCard>

          <SectionCard>
            <StepHeader number={2} title="Slots, wage & duration" subtitle="Fills first-come, first-served" />

            <View style={[s.field, s.row]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Workers needed *</Text>
                <TextInput
                  style={s.input}
                  value={workersNeeded}
                  onChangeText={setWorkersNeeded}
                  placeholder="e.g. 10"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Daily wage (₹)</Text>
                <TextInput
                  style={s.input}
                  value={dailyWage}
                  onChangeText={setDailyWage}
                  placeholder="e.g. 500"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={[s.field, s.row]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Duration (days)</Text>
                <TextInput
                  style={s.input}
                  value={durationDays}
                  onChangeText={setDurationDays}
                  placeholder="e.g. 5"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Budget (₹, optional)</Text>
                <TextInput
                  style={s.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder={autoBudget ? `Auto: ₹${autoBudget}` : 'e.g. 25000'}
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {!!autoBudget && !budget && (
              <Text style={s.hint}>
                Leave blank and we'll estimate ₹{autoBudget} ({needed} workers × ₹{wage}/day × {duration} days). This is only visible to you, never to workers.
              </Text>
            )}

            <View style={s.field}>
              <Text style={s.label}>Contact number (WhatsApp) *</Text>
              <TextInput
                style={s.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="e.g. 98765 43210"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </SectionCard>

          <View style={s.noteBox}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={s.noteTxt}>
              Tapping below opens WhatsApp with your project details filled in and sent to our CityPlus team. We'll quote a price for your requirement and share a payment QR — your project goes live only after payment is confirmed.
            </Text>
          </View>

          <TouchableOpacity
            style={s.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.submitBtnTxt}>Send via WhatsApp</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6 },
  hint: { fontSize: 11, color: '#999', marginTop: 6, lineHeight: 15 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#111',
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 11 },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  skillChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  skillChipTxt: { fontSize: 12, fontWeight: '700', color: '#555' },
  skillChipTxtActive: { color: '#fff' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fff7f0', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa',
    padding: 12, marginBottom: 18,
  },
  noteTxt: { flex: 1, fontSize: 12, color: '#9a3412', lineHeight: 17, fontWeight: '500' },

  submitBtn: {
    flexDirection: 'row', backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
