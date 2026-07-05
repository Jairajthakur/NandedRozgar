/**
 * LanguagePickerScreen
 * ─────────────────────────────────────────────────────────────────────────
 * Shown exactly once, to first-time users, before Onboarding/Login — see
 * App.js RootNavigator, which routes here only when LangProvider reports
 * `hasSavedLang === false` (i.e. the user has never explicitly chosen a
 * language; only the auto-detected device default is in effect).
 *
 * Selecting a language calls changeLang() (src/utils/i18n.js), which persists
 * it via storage.js — so this screen never appears again on this device
 * (returning users go straight to Onboarding/Login).
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang, LANGUAGES } from '../utils/i18n';

const ORANGE = '#f97316';

export default function LanguagePickerScreen({ onDone }) {
  const { changeLang } = useLang();
  const [selected, setSelected] = useState(null);
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    if (!selected) return;
    changeLang(selected);
    onDone?.();
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <View style={s.logoCircle}>
          <Ionicons name="language" size={32} color={ORANGE} />
        </View>
        <Text style={s.title}>Choose Your Language</Text>
        <Text style={s.titleNative}>भाषा निवडा · भाषा चुनें</Text>
      </View>

      <View style={s.list}>
        {LANGUAGES.map(l => {
          const active = selected === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              style={[s.card, active && s.cardActive]}
              activeOpacity={0.8}
              onPress={() => setSelected(l.code)}
            >
              <View style={[s.badge, active && s.badgeActive]}>
                <Text style={[s.badgeTxt, active && s.badgeTxtActive]}>{l.native}</Text>
              </View>
              <Text style={[s.cardLabel, active && s.cardLabelActive]}>{l.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={22} color={ORANGE} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[s.continueBtn, !selected && s.continueBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleContinue}
        disabled={!selected}
      >
        <Text style={s.continueBtnTxt}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      <Text style={s.footNote}>You can change this anytime from your profile.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff3e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },
  titleNative: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ebebeb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  cardActive: {
    borderColor: ORANGE,
    backgroundColor: '#fff8f2',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  badgeActive: {
    backgroundColor: ORANGE,
  },
  badgeTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  badgeTxtActive: {
    color: '#fff',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardLabelActive: {
    color: '#111',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 16,
  },
  continueBtnDisabled: {
    backgroundColor: '#f6c294',
  },
  continueBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footNote: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 14,
  },
});
