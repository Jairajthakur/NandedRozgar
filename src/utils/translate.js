/**
 * translate.js — Auto-translation for NandedRozgar
 *
 * Automatically translates content when the user switches to Hindi or Marathi.
 * No buttons — works exactly like changing the app language would.
 *
 * Uses MyMemory free API (no key needed).
 * All results are cached in AsyncStorage so the API is hit only once per text+lang.
 *
 * Usage — drop-in replacement for <Text> in any screen:
 *
 *   import { AutoTranslate } from '../utils/translate';
 *   import { useLang } from '../utils/i18n';
 *
 *   const { lang } = useLang();
 *   <AutoTranslate text={job.description} lang={lang} style={s.descText} />
 */

import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Config ────────────────────────────────────────────────────────────────────

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

// Optional: add your email to raise free limit 500 → 10,000 words/day
const MYMEMORY_EMAIL = ''; // e.g. 'yourapp@gmail.com'

const CACHE_PREFIX = 'nr_trans_v1_';

// ── Core translation function ─────────────────────────────────────────────────

function simpleHash(str) {
  let h = 0;
  const s = str.slice(0, 120);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

export async function translateText(text, targetLang) {
  if (!text || !text.trim() || targetLang === 'en') return text;

  const cacheKey = CACHE_PREFIX + targetLang + '_' + simpleHash(text);

  // 1. Return cached result immediately
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
      if (translated.trim() && translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
        try { await AsyncStorage.setItem(cacheKey, translated); } catch (_) {}
        return translated;
      }
    }
  } catch (_) {}

  return text; // fallback — show original silently
}

// ── AutoTranslate component ───────────────────────────────────────────────────

/**
 * Drop-in replacement for <Text>.
 * Automatically translates `text` when `lang` is 'hi' or 'mr'.
 * Shows original text instantly, then swaps to translation when ready.
 *
 * Props:
 *   text          — original English string
 *   lang          — current app language ('en' | 'hi' | 'mr')
 *   style         — Text style (same as you'd pass to <Text>)
 *   numberOfLines — forwarded to Text
 */
export function AutoTranslate({ text, lang, style, numberOfLines }) {
  const [display, setDisplay] = useState(text);
  const cancelRef = useRef(false);

  useEffect(() => {
    // Reset to original whenever text or lang changes
    setDisplay(text);
    cancelRef.current = false;

    if (!text || lang === 'en') return;

    translateText(text, lang).then(result => {
      if (!cancelRef.current && result && result !== text) {
        setDisplay(result);
      }
    });

    return () => { cancelRef.current = true; };
  }, [text, lang]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {display}
    </Text>
  );
}
