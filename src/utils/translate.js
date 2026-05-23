/**
 * translate.js — Auto-translation for NandedRozgar
 *
 * Uses MyMemory free API (no key needed, 10K words/day with email param)
 * Caches all translations in AsyncStorage so the API is hit only once per text+lang.
 *
 * Usage in any detail screen:
 *   import { TranslateBlock } from '../utils/translate';
 *   import { useLang } from '../utils/i18n';
 *
 *   const { lang } = useLang();
 *   <TranslateBlock text={job.description} lang={lang} style={s.descText} />
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Config ────────────────────────────────────────────────────────────────────

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

// Optional: add your email to raise free limit from 500 → 10,000 words/day
// Set this in environment or replace the empty string with your email.
const MYMEMORY_EMAIL = 'th.jairaj@gmail.com';          // e.g. 'yourapp@gmail.com'

const CACHE_PREFIX = 'nr_trans_v1_';

// Language display labels for the button
const LANG_LABELS = {
  hi: { see: 'अनुवाद देखें', hide: 'छुपाएं' },       // Hindi
  mr: { see: 'भाषांतर पहा', hide: 'लपवा' },           // Marathi
};

// ── Core translation function ─────────────────────────────────────────────────

/**
 * Translates `text` from English to `targetLang` (hi or mr).
 * Returns the translated string, or the original on failure.
 * Results are cached in AsyncStorage.
 */
export async function translateText(text, targetLang) {
  if (!text || !text.trim() || targetLang === 'en') return text;

  const cacheKey = CACHE_PREFIX + targetLang + '_' + simpleHash(text);

  // 1. Return cached result if available
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (_) {}

  // 2. Call MyMemory API
  try {
    let url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    if (MYMEMORY_EMAIL) url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;

    const res  = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();

    if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;

      // Avoid saving a result identical to the source (API returned nothing useful)
      if (translated.trim() && translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
        try { await AsyncStorage.setItem(cacheKey, translated); } catch (_) {}
        return translated;
      }
    }
  } catch (_) {}

  return text; // fallback — show original
}

// ── Simple hash for cache keys ────────────────────────────────────────────────

function simpleHash(str) {
  let h = 0;
  const s = str.slice(0, 120); // only hash first 120 chars
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

// ── TranslateBlock component ──────────────────────────────────────────────────

/**
 * Drop-in replacement for <Text> that adds an Instagram-style
 * "See translation" button when the user's language ≠ English.
 *
 * Props:
 *   text   — the original English string
 *   lang   — current app language from useLang() ('en' | 'hi' | 'mr')
 *   style  — Text style for both original and translated text
 *   numberOfLines — forwarded to Text
 */
export function TranslateBlock({ text, lang, style, numberOfLines }) {
  const [translated, setTranslated]   = useState(null);
  const [showTranslated, setShow]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [failed, setFailed]           = useState(false);

  // English users — render exactly like a plain <Text>
  if (!text || lang === 'en') {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  const labels = LANG_LABELS[lang] || { see: 'See translation', hide: 'Hide' };

  async function handlePress() {
    // If already fetched, just toggle show/hide
    if (translated !== null) {
      setShow(v => !v);
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      const result = await translateText(text, lang);
      setTranslated(result);
      // Only show if translation is meaningfully different
      setShow(result !== text);
    } catch (_) {
      setFailed(true);
    }
    setLoading(false);
  }

  const isTranslationDifferent = translated && translated !== text;

  return (
    <View>
      {/* Original text — always visible */}
      <Text style={style} numberOfLines={numberOfLines}>{text}</Text>

      {/* Translated text — shown after tap */}
      {showTranslated && isTranslationDifferent && (
        <View style={styles.translatedBox}>
          <View style={styles.translatedDivider} />
          <Text style={[style, styles.translatedText]}>{translated}</Text>
        </View>
      )}

      {/* Instagram-style button row */}
      <TouchableOpacity
        style={styles.btn}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size={10} color="#94a3b8" style={{ marginRight: 4 }} />
        ) : (
          <Text style={styles.globeIcon}>🌐</Text>
        )}

        <Text style={styles.btnText}>
          {loading
            ? (lang === 'hi' ? 'अनुवाद हो रहा है…' : 'भाषांतर होत आहे…')
            : failed
              ? (lang === 'hi' ? 'पुनः प्रयास करें' : 'पुन्हा प्रयत्न करा')
              : showTranslated && isTranslationDifferent
                ? labels.hide
                : labels.see}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── TranslateTitle ────────────────────────────────────────────────────────────
/**
 * Lighter version for headings — translates inline (no toggle, auto on mount).
 * Use for job titles, item names etc where the user always wants the translation.
 */
export function TranslateTitle({ text, lang, style, numberOfLines }) {
  const [display, setDisplay] = useState(text);
  const [translated, setTranslated] = useState(false);

  React.useEffect(() => {
    if (!text || lang === 'en') return;
    let cancelled = false;
    translateText(text, lang).then(result => {
      if (!cancelled && result && result !== text) {
        setDisplay(result);
        setTranslated(true);
      }
    });
    return () => { cancelled = true; };
  }, [text, lang]);

  return (
    <View>
      <Text style={style} numberOfLines={numberOfLines}>{display}</Text>
      {translated && (
        <Text style={styles.originalHint}>{text}</Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Translated text block
  translatedBox: {
    marginTop: 10,
  },
  translatedDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 8,
  },
  translatedText: {
    color: '#0f172a',
    opacity: 0.9,
  },

  // "See translation" button
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  globeIcon: {
    fontSize: 11,
  },
  btnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: '#94a3b8',
    textDecorationStyle: 'dotted',
  },

  // Original text shown below translated title
  originalHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
