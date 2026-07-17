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
 * Fully localized (English / Marathi / Hindi) via useLang() — this includes
 * the WhatsApp message itself, so the CityPlus team receives the request in
 * whichever language the contractor was using.
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
import { useLang } from '../utils/i18n';
import { LABOUR_COLORS, SKILL_ICONS } from '../constants/labourTheme';
import { SectionCard, StepHeader } from '../components/labour/LabourUI';

const ORANGE = LABOUR_COLORS.primary;
// Values stay in English (stored/sent as-is to the backend / team); only the
// displayed chip label is translated, same pattern as SKILL_T_KEYS elsewhere.
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper', 'Other'];
const SKILL_T_KEYS = {
  Mason: 'skillMason', Electrician: 'skillElectrician', Plumber: 'skillPlumber',
  Painter: 'skillPainter', Carpenter: 'skillCarpenter', Welder: 'skillWelder',
  Helper: 'skillHelper', Other: 'skillOther',
};

// Same CityPlus support number used elsewhere (HelpSupportScreen, PromoteBusinessScreen).
const WHATSAPP_NUMBER = '919834308805';

export default function PostProjectScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentDistrict } = useDistrict();
  const { t } = useLang();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillCategories, setSkillCategories] = useState(['Mason']);

  const toggleSkill = (sk) => {
    setSkillCategories(prev => {
      if (prev.includes(sk)) {
        // Keep at least one trade selected.
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== sk);
      }
      return [...prev, sk];
    });
  };
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
      Toast.show({ type: 'error', text1: t('postProjErrTitleTitle'), text2: t('postProjErrTitleMsg') });
      return;
    }
    if (needed < 1) {
      Toast.show({ type: 'error', text1: t('postProjErrWorkersTitle'), text2: t('postProjErrWorkersMsg') });
      return;
    }
    if (!contactPhone.trim()) {
      Toast.show({ type: 'error', text1: t('postProjErrContactTitle'), text2: t('postProjErrContactMsg') });
      return;
    }

    const skillLabel = skillCategories
      .map(sk => t(SKILL_T_KEYS[sk]) || sk)
      .join(', ');
    const dash = '—';

    const lines = [
      t('postProjWaHeader'),
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `*${t('postProjWaTitleLabel')}* ${title.trim()}`,
      `*${t('postProjWaTradeLabel')}* ${skillLabel}`,
      `*${t('postProjWaWorkersLabel')}* ${needed}`,
      `*${t('postProjWaWageLabel')}* ${wage ? `₹${wage}` : dash}`,
      `*${t('postProjWaDurationLabel')}* ${duration ? `${duration} ${duration === 1 ? t('projDaySingular') : t('projDayPlural')}` : dash}`,
      `*${t('postProjWaBudgetLabel')}* ${budget ? `₹${budget}` : autoBudget ? `₹${autoBudget}` : dash}`,
      `*${t('postProjWaLocationLabel')}* ${location.trim() || dash}`,
      `*${t('postProjWaDistrictLabel')}* ${currentDistrict?.name || dash}`,
      `*${t('postProjWaContactLabel')}* ${contactPhone.trim()}`,
      ``,
      `*${t('postProjWaDescLabel')}*`,
      description.trim() || dash,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      t('postProjWaFooter'),
    ];
    const msg = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

    Linking.openURL(url)
      .then(() => {
        Toast.show({ type: 'success', text1: t('postProjSuccessTitle'), text2: t('postProjSuccessMsg') });
        nav.goBack();
      })
      .catch(() => {
        Alert.alert(t('postProjWaNotFoundTitle'), t('postProjWaNotFoundMsg'));
      });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('postProjTopBarTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <SectionCard>
            <StepHeader number={1} title={t('postProjStep1Title')} subtitle={t('postProjStep1Sub')} />

            <View style={s.field}>
              <Text style={s.label}>{t('postProjTitleLabel')}</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('postProjTitlePlaceholder')}
                placeholderTextColor="#bbb"
                maxLength={150}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('postProjTradeLabel')}</Text>
              <Text style={[s.hint, { marginTop: 0, marginBottom: 8 }]}>{t('postProjTradeMultiHint')}</Text>
              <View style={s.skillGrid}>
                {SKILLS.map(sk => {
                  const active = skillCategories.includes(sk);
                  return (
                    <TouchableOpacity
                      key={sk}
                      onPress={() => toggleSkill(sk)}
                      style={[s.skillChip, active && s.skillChipActive]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={SKILL_ICONS[sk] || 'briefcase-outline'} size={14} color={active ? '#fff' : ORANGE} />
                      <Text style={[s.skillChipTxt, active && s.skillChipTxtActive]}>{t(SKILL_T_KEYS[sk]) || sk}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('postProjDescLabel')}</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('postProjDescPlaceholder')}
                placeholderTextColor="#bbb"
                multiline
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('postProjLocationLabel')}</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder={t('postProjLocationPlaceholder')}
                placeholderTextColor="#bbb"
              />
              <Text style={s.hint}>
                {t('postProjDistrictHint').replace('{DISTRICT}', currentDistrict?.name || t('postProjLocationLabel'))}
              </Text>
            </View>
          </SectionCard>

          <SectionCard>
            <StepHeader number={2} title={t('postProjStep2Title')} subtitle={t('postProjStep2Sub')} />

            <View style={[s.field, s.row]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t('postProjWorkersLabel')}</Text>
                <TextInput
                  style={s.input}
                  value={workersNeeded}
                  onChangeText={setWorkersNeeded}
                  placeholder={t('postProjWorkersPlaceholder')}
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t('postProjWageLabel')}</Text>
                <TextInput
                  style={s.input}
                  value={dailyWage}
                  onChangeText={setDailyWage}
                  placeholder={t('postProjWagePlaceholder')}
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={[s.field, s.row]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t('postProjDurationLabel')}</Text>
                <TextInput
                  style={s.input}
                  value={durationDays}
                  onChangeText={setDurationDays}
                  placeholder={t('postProjDurationPlaceholder')}
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t('postProjBudgetLabel')}</Text>
                <TextInput
                  style={s.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder={autoBudget ? `₹${autoBudget}` : t('postProjBudgetPlaceholder')}
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {!!autoBudget && !budget && (
              <Text style={s.hint}>
                {t('postProjAutoBudgetHint')
                  .replace('{AMOUNT}', autoBudget)
                  .replace('{N}', needed)
                  .replace('{WAGE}', wage)
                  .replace('{D}', duration)}
              </Text>
            )}

            <View style={s.field}>
              <Text style={s.label}>{t('postProjContactLabel')}</Text>
              <TextInput
                style={s.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder={t('postProjContactPlaceholder')}
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </SectionCard>

          <View style={s.noteBox}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={s.noteTxt}>{t('postProjNoteTxt')}</Text>
          </View>

          <TouchableOpacity
            style={s.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.submitBtnTxt}>{t('postProjSubmitBtn')}</Text>
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
