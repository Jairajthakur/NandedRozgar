/**
 * AudioSkillBadge.js — one-tap skill tile with a spoken audio label
 *
 * Typing your trade/experience is a real barrier for a worker who can't
 * read comfortably. This replaces text-entry with:
 *   - a giant, recognisable illustration (emoji glyph) for the trade
 *   - a small "play" button that speaks the trade name out loud, in the
 *     worker's own language (Marathi / Hindi / English)
 *   - a single tap on the tile itself to select it — no typing at all
 *
 * Uses expo-speech (on-device text-to-speech) rather than pre-recorded MP3
 * files, so every trade/language combination "just works" without needing
 * a studio-recorded audio asset per skill per language.
 *
 * Place at: src/components/labour/AudioSkillBadge.js
 *
 * Usage:
 *   <AudioSkillBadge
 *     emoji="🧱" label="Mason" localLabel="गवंडी काम" lang="mr"
 *     active={skill === 'Mason'} onPress={() => setSkill('Mason')}
 *   />
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LABOUR_COLORS as C } from '../../constants/labourTheme';

// Speech language codes expo-speech / Web Speech API expect.
const SPEECH_LOCALE = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };

// Lazily require expo-speech so this file doesn't crash on a platform/build
// where the native module isn't linked yet — the tile still works for
// selection, it just silently skips the spoken playback.
let Speech = null;
try { Speech = require('expo-speech'); } catch { /* not available */ }

function speak(text, lang) {
  const locale = SPEECH_LOCALE[lang] || SPEECH_LOCALE.en;
  if (Platform.OS === 'web') {
    try {
      const synth = window?.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = locale;
      utter.rate = 0.9;
      synth.speak(utter);
    } catch { /* Web Speech API unavailable — ignore */ }
    return;
  }
  try {
    Speech?.stop?.();
    Speech?.speak?.(text, { language: locale, rate: 0.9 });
  } catch { /* expo-speech unavailable — ignore */ }
}

export default function AudioSkillBadge({
  emoji = '🛠️',
  icon,
  label,
  localLabel,
  lang = 'mr',
  active = false,
  onPress,
  size = 'md',
}) {
  const [playing, setPlaying] = useState(false);
  const big = size === 'lg';

  const handlePlay = useCallback((e) => {
    e?.stopPropagation?.();
    setPlaying(true);
    speak(localLabel || label, lang);
    setTimeout(() => setPlaying(false), 900);
  }, [label, localLabel, lang]);

  return (
    <TouchableOpacity
      style={[st.tile, big && st.tileLg, active && st.tileActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[st.glyphWrap, big && st.glyphWrapLg, active && st.glyphWrapActive]}>
        {icon
          ? <Ionicons name={icon} size={big ? 30 : 24} color={active ? '#fff' : C.worker} />
          : <Text style={[st.glyph, big && st.glyphLg]}>{emoji}</Text>}
      </View>

      <Text style={[st.label, big && st.labelLg, active && st.labelActive]} numberOfLines={1}>
        {label}
      </Text>
      {!!localLabel && (
        <Text style={[st.localLabel, active && st.localLabelActive]} numberOfLines={1}>
          {localLabel}
        </Text>
      )}

      <TouchableOpacity
        style={[st.playBtn, active && st.playBtnActive]}
        onPress={handlePlay}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={playing ? 'volume-high' : 'play'}
          size={big ? 16 : 13}
          color={active ? '#fff' : C.worker}
        />
      </TouchableOpacity>

      {active && (
        <View style={st.checkDot}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  tile: {
    width: 92, minHeight: 100, borderRadius: 16, padding: 10,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ececec',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  tileLg: { width: 130, minHeight: 140, borderRadius: 20, padding: 14 },
  tileActive: { backgroundColor: C.worker, borderColor: C.worker },

  glyphWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#fef3e2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  glyphWrapLg: { width: 60, height: 60, borderRadius: 18, marginBottom: 10 },
  glyphWrapActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  glyph: { fontSize: 24 },
  glyphLg: { fontSize: 32 },

  label: { fontSize: 12.5, fontWeight: '800', color: C.text, textAlign: 'center' },
  labelLg: { fontSize: 15 },
  labelActive: { color: '#fff' },
  localLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 1, textAlign: 'center' },
  localLabelActive: { color: 'rgba(255,255,255,0.85)' },

  playBtn: {
    marginTop: 8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fef3e2', alignItems: 'center', justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: 'rgba(255,255,255,0.22)' },

  checkDot: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
});
