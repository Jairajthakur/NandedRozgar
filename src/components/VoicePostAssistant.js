/**
 * VoicePostAssistant.js
 * ─────────────────────────────────────────────────────────────────
 * Voice-to-form component for all NandedRozgar post screens.
 * Supports Hindi / Marathi / English speech.
 *
 * Props:
 *   screenType  — 'job' | 'room' | 'item' | 'vehicle'
 *   onFill(fields) — called with extracted field values
 *
 * Speech recognition: uses expo-speech-recognition when installed.
 * If the package is not present the mic button shows a friendly
 * "install required" message instead of crashing.
 *
 * IMPORTANT – Metro bundler note:
 * Neither `await import()` nor `require()` inside try/catch work for
 * optional native packages in a Metro bundle:
 *   • `await import()` → Metro can't build the chunk graph → build crash
 *   • `require()` in try/catch → Metro still registers the module ID at
 *     bundle time; at runtime the ID resolves to undefined and throws
 *     "Requiring unknown module N" — bypassing the catch block.
 *
 * The only safe pattern is: never reference an uninstalled package
 * anywhere in the JS bundle.  Speech capability is therefore detected
 * at runtime via a sentinel constant (SPEECH_AVAILABLE) that is set to
 * `false` here and must be manually flipped to `true` after running:
 *   npx expo install expo-speech-recognition
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Animated, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';
// API is called through your own backend — never directly from the app.
// Direct calls to api.anthropic.com from a mobile app are blocked (CORS/auth)
// and would expose your API key. The backend proxies to Groq (free, fast).
import { BASE_URL } from '../utils/constants';
import { getToken } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// SPEECH_AVAILABLE – flip this to `true` only after you have run:
//   npx expo install expo-speech-recognition
// and rebuilt the app.  Keeping it `false` prevents Metro from trying to
// bundle the (missing) native module and crashing with
// "Requiring unknown module N".
// ─────────────────────────────────────────────────────────────────────────────
const SPEECH_AVAILABLE = true;

import * as ExpoSpeech from 'expo-speech-recognition';

const LANG_OPTIONS = [
  { code: 'hi-IN', label: 'हिंदी',  flag: '🇮🇳' },
  { code: 'mr-IN', label: 'मराठी',  flag: '🟠' },
  { code: 'en-IN', label: 'English', flag: '🔤' },
];

// ── Allowed values (mirror each screen's static data) ─────────────────────────
const VALID_JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Freshers Welcome'];
const VALID_EXPERIENCE = ['Fresher (0 yr)', '6 Months', '1 Year', '2 Years', '3 Years', '5+ Years'];
const VALID_WORK_HOURS = ['9 AM – 6 PM', '10 AM – 7 PM', '8 AM – 5 PM', '6 AM – 2 PM', '2 PM – 10 PM', 'Night Shift', 'Flexible'];
const VALID_EDUCATION  = ['none', '10th', '12th', 'graduate', 'diploma'];
const VALID_SKILLS     = [
  'Marathi', 'Hindi', 'English', 'MS Excel', 'Tally', 'Typing', 'Computer Basics', 'DTP',
  'Driving Licence', '2-Wheeler', '4-Wheeler', 'Heavy Vehicle',
  'Customer Service', 'Billing / POS', 'Cooking', 'First Aid',
  'Cash Handling', 'Unarmed Security', 'Stitching / Tailoring', 'Welding', 'Electrical Work', 'Plumbing',
];

// ── Per-screen prompt config ───────────────────────────────────────────────────
const SCREEN_CONFIG = {
  job: {
    title: 'Job Post',
    hints: {
      'mr-IN': '"मला delivery boy साठी नोकरी टाकायची. पगार 8 ते 12 हजार, full time, bike असणे आवश्यक, fresher चालेल."',
      'hi-IN': '"Mujhe delivery boy ki naukri post karni hai. Salary 8 se 12 hazar, full time, bike hona zaruri, fresher chalega."',
      'en-IN': '"I want to post for a delivery boy. Salary 8 to 12 thousand, full time shift, own bike required, freshers welcome."',
    },
    systemPrompt: (langLabel) => `You are a form-filling assistant for a job posting app used in tier-2 cities in Maharashtra.\n\nUser spoke in ${langLabel}. Extract job details and return ONLY a valid JSON object (no markdown, no extra text):\n\n{\n  "title": "Job title in English",\n  "company": "Company name if mentioned",\n  "industry": "Closest match from: Cafe/Tea Stall Boy, Hotel Waiter, Cook/Chef, Kitchen Helper, Delivery Boy (2-Wheeler), Courier Executive, Auto Driver, Car Driver, Shop Assistant/Helper, Salesman, Mason/Contractor, Electrician, Plumber, Hair Stylist, Data Entry Operator, Receptionist, Field Sales Executive, TeleCaller, School Teacher, Maid/Househelp, Security Guard, Software Developer, Other/Custom",\n  "jobType": "One of: Full-time, Part-time, Contract, Freshers Welcome",\n  "salaryMin": "number string only e.g. 8000",\n  "salaryMax": "number string only e.g. 12000",\n  "experience": "One of: Fresher (0 yr), 6 Months, 1 Year, 2 Years, 3 Years, 5+ Years",\n  "workHours": "One of: 9 AM – 6 PM, 10 AM – 7 PM, 8 AM – 5 PM, 6 AM – 2 PM, 2 PM – 10 PM, Night Shift, Flexible",\n  "education": "One of: none, 10th, 12th, graduate, diploma",\n  "skills": ["pick only from: Marathi, Hindi, English, MS Excel, Tally, Typing, Driving Licence, 2-Wheeler, 4-Wheeler, Customer Service, Cooking, Welding, Electrical Work, Plumbing"],\n  "description": "2-3 sentence job description in English",\n  "requirements": "Requirements in English (age, bike, local candidate, etc.)",\n  "address": "Area or locality if mentioned"\n}\n\nRules: JSON only. Omit fields you are unsure about. Translate everything to English.\nSalary: "8 se 12 hazar" → salaryMin:"8000", salaryMax:"12000". "10 hazar" → salaryMin:"10000".`,
  },

  room: {
    title: 'Room / Property',
    hints: {
      'mr-IN': '"1 BHK flat भाड्यावर द्यायचा आहे. भाडे 5500 महिना, deposit 11000. Cidco area मध्ये, near bus stand."',
      'hi-IN': '"1 BHK flat kiraye pe dena hai. Kiraya 5500 mahina, deposit 11000. Cidco area mein, bus stand ke paas."',
      'en-IN': '"Want to rent out 1 BHK flat. Rent 5500 per month, deposit 11000. Located in Cidco area near bus stand."',
    },
    systemPrompt: (langLabel) => `You are a form-filling assistant for a room/property listing app in Maharashtra.\n\nUser spoke in ${langLabel}. Extract property details and return ONLY a valid JSON object:\n\n{\n  "rent": "monthly rent as number string e.g. 5500",\n  "deposit": "deposit as number string e.g. 11000",\n  "salePrice": "sale price if sale listing, e.g. 4500000",\n  "saleCarpetArea": "carpet area in sqft if mentioned",\n  "landmark": "landmark or address details",\n  "notes": "any extra rules, facilities, or description in English",\n  "whatsapp": "phone number if mentioned"\n}\n\nRules: JSON only. Omit fields you are unsure about. Translate to English. Numbers only for amounts.`,
  },

  item: {
    title: 'Buy/Sell Item',
    hints: {
      'mr-IN': '"Samsung 42 inch TV विकायचा आहे. किंमत 8000 rupees. 2 वर्षे जुना, चांगल्या condition मध्ये."',
      'hi-IN': '"Samsung 42 inch TV bechna hai. Daam 8000 rupaye. 2 saal purana, achchi condition mein."',
      'en-IN': '"Want to sell Samsung 42 inch TV. Price 8000 rupees. 2 years old, good condition."',
    },
    systemPrompt: (langLabel) => `You are a form-filling assistant for a buy/sell listing app in Maharashtra.\n\nUser spoke in ${langLabel}. Extract item details and return ONLY a valid JSON object:\n\n{\n  "title": "Item title in English e.g. Samsung 42 inch TV",\n  "price": "price as number string e.g. 8000",\n  "description": "item description in English (brand, model, condition, reason for selling)",\n  "area": "area or locality if mentioned"\n}\n\nRules: JSON only. Omit fields you are unsure about. Translate to English.`,
  },

  vehicle: {
    title: 'Vehicle Rental',
    hints: {
      'mr-IN': '"माझी Maruti Swift भाड्याने द्यायची आहे. दररोज 800 rupees. Cidco area मधून pickup. AC, music system आहे."',
      'hi-IN': '"Meri Maruti Swift kiraye pe deni hai. Roz ka 800 rupaye. Cidco area se pickup. AC, music system hai."',
      'en-IN': '"Want to rent out my Maruti Swift. 800 rupees per day. Pickup from Cidco area. Has AC and music system."',
    },
    systemPrompt: (langLabel) => `You are a form-filling assistant for a vehicle rental listing app in Maharashtra.\n\nUser spoke in ${langLabel}. Extract vehicle details and return ONLY a valid JSON object:\n\n{\n  "title": "Vehicle name/model in English e.g. Maruti Swift",\n  "salaryMin": "daily rental rate as number string e.g. 800",\n  "deposit": "security deposit if mentioned",\n  "description": "vehicle features and notes in English",\n  "whatsapp": "phone number if mentioned"\n}\n\nRules: JSON only. Omit fields you are unsure about. Translate to English.`,
  },
};

// ── Pulse animation hook ───────────────────────────────────────────────────────
function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  const loop = useRef(null);
  const start = useCallback(() => {
    loop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.current.start();
  }, [anim]);
  const stop = useCallback(() => {
    loop.current?.stop();
    anim.setValue(1);
  }, [anim]);
  return { anim, start, stop };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function VoicePostAssistant({ onFill, screenType = 'job', style }) {
  const config = SCREEN_CONFIG[screenType] || SCREEN_CONFIG.job;

  const [modalVisible, setModalVisible] = useState(false);
  const [lang, setLang]                 = useState('mr-IN');
  const [status, setStatus]             = useState('idle');
  const [transcript, setTranscript]     = useState('');
  const [errorMsg, setErrorMsg]         = useState('');
  const [filledFields, setFilledFields] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');  // FIX: live partial text

  const { anim, start: startPulse, stop: stopPulse } = usePulse();

  const langLabel = lang === 'hi-IN' ? 'Hindi' : lang === 'mr-IN' ? 'Marathi' : 'English';

  // ── Start listening ──────────────────────────────────────────────────────────
  async function startListening() {
    // Guard: if expo-speech-recognition is not installed, show a clear message
    // instead of crashing.  See SPEECH_AVAILABLE constant at top of file.
    if (!SPEECH_AVAILABLE) {
      setStatus('error');
      setErrorMsg(
        'Speech recognition abhi install nahi hai.\n' +
        'Developer se kahein:\n' +
        'npx expo install expo-speech-recognition\n\n' +
        'स्पीच रेकग्निशन install नाही. Developer ला सांगा.'
      );
      return;
    }

    setStatus('listening');
    setTranscript('');
    setLiveTranscript('');   // FIX: clear live preview
    setErrorMsg('');
    setFilledFields(null);
    startPulse();

    // ── expo-speech-recognition path ──────────────────────────────────────────
    // This block only runs when SPEECH_AVAILABLE = true and the import above
    // is uncommented.  At that point ExpoSpeech is a real module in scope.
    try {
      const { granted } = await ExpoSpeech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        stopPulse();
        setStatus('error');
        setErrorMsg('Microphone permission denied. Please allow in settings.');
        return;
      }
      ExpoSpeech.ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,   // we'll filter for isFinal=true below
        continuous: true,        // FIX: don't auto-stop after first silence
      });
    } catch (err) {
      stopPulse();
      setStatus('error');
      setErrorMsg(err?.message || 'Microphone start nahi hua.');
    }
  }

  // ── Handle speech result ─────────────────────────────────────────────────────
  async function handleSpeechResult(text) {
    stopPulse();
    if (!text?.trim()) {
      setStatus('error');
      setErrorMsg('Kuch sunai nahi diya. Phir se try karein.\nकाही ऐकू आले नाही, पुन्हा try करा.');
      return;
    }
    setTranscript(text);
    setStatus('processing');
    await callClaude(text);
  }

  // ── Manual stop — user taps "Done Speaking" button ─────────────────────────
  async function stopListening() {
    if (!SPEECH_AVAILABLE) return;
    try {
      ExpoSpeech.ExpoSpeechRecognitionModule.stop();
    } catch {}
    // If we have a live transcript already, process it immediately
    if (liveTranscript.trim()) {
      await handleSpeechResult(liveTranscript.trim());
    }
  }

  // ── Called when OS ends recognition (silence timeout / end event) ─────────
  async function handleEnd() {
    // If a result already came in and we moved past 'listening', ignore
    if (status !== 'listening') return;
    // If we accumulated partial text, process it
    if (liveTranscript.trim()) {
      await handleSpeechResult(liveTranscript.trim());
    } else {
      // No speech detected at all
      stopPulse();
      setStatus('error');
      setErrorMsg('Kuch sunai nahi diya. Phir se try karein.\nकाही ऐकू आले नाही, पुन्हा try करा.');
    }
  }

  // ── Backend AI call ───────────────────────────────────────────────────────────
  // Calls YOUR server at /api/ai/voice-fill which proxies to Groq.
  // This avoids exposing any API key in the app bundle and bypasses CORS blocks
  // that prevent mobile apps from calling api.anthropic.com directly.
  async function callClaude(text) {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/ai/voice-fill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          transcript: text,
          screenType,
          lang,
        }),
      });

      const data = await res.json();

      if (!data?.ok) {
        setStatus('error');
        setErrorMsg(data?.error || 'AI connect nahi hua. Phir try karein.');
        return;
      }

      const parsed = data.fields;

      // Sanitise job-specific fields against known-valid values
      if (screenType === 'job') {
        if (parsed.jobType    && !VALID_JOB_TYPES.includes(parsed.jobType))    delete parsed.jobType;
        if (parsed.experience && !VALID_EXPERIENCE.includes(parsed.experience)) delete parsed.experience;
        if (parsed.workHours  && !VALID_WORK_HOURS.includes(parsed.workHours)) delete parsed.workHours;
        if (parsed.education  && !VALID_EDUCATION.includes(parsed.education))  delete parsed.education;
        if (Array.isArray(parsed.skills)) {
          parsed.skills = parsed.skills.filter(s => VALID_SKILLS.includes(s));
          if (!parsed.skills.length) delete parsed.skills;
        }
      }

      setFilledFields(parsed);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg('AI connect nahi hua. Internet check karein.\n(' + (err?.message || '') + ')');
    }
  }

  function applyAndClose() {
    if (filledFields) onFill(filledFields);
    setModalVisible(false);
    setStatus('idle');
    setFilledFields(null);
    setTranscript('');
  }

  function retry() {
    setStatus('idle');
    setTranscript('');
    setLiveTranscript('');  // FIX: clear live transcript on retry
    setFilledFields(null);
    setErrorMsg('');
  }

  const filledCount = filledFields ? Object.keys(filledFields).length : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button ── */}
      <TouchableOpacity
        style={[styles.triggerBtn, style]}
        onPress={() => { setModalVisible(true); setStatus('idle'); }}
        activeOpacity={0.85}
      >
        <Ionicons name="mic" size={18} color="#fff" />
        <Text style={styles.triggerLabel}>बोलकर भरें / बोलून भरा</Text>
        <View style={styles.newBadge}><Text style={styles.newBadgeTxt}>NEW</Text></View>
      </TouchableOpacity>

      {/* ── Modal sheet ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>🎙️ Voice Post Assistant</Text>
                <Text style={styles.sheetScreenType}>{config.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              बोलो और सभी fields अपने आप भर जाएंगी {'  '}
              <Text style={{ color: '#6b7280' }}>बोला आणि सर्व fields आपोआप भरतील</Text>
            </Text>

            {/* Language picker */}
            <View style={styles.langRow}>
              {LANG_OPTIONS.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langChip, lang === l.code && styles.langChipActive]}
                  onPress={() => setLang(l.code)}
                >
                  <Text style={styles.langFlag}>{l.flag}</Text>
                  <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hint box */}
            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>💡 Example / उदाहरण:</Text>
              <Text style={styles.hintText}>{config.hints[lang]}</Text>
            </View>

            {/* ── idle ── */}
            {status === 'idle' && (
              <View style={styles.centeredArea}>
                <Animated.View style={{ transform: [{ scale: anim }] }}>
                  <TouchableOpacity style={styles.bigMic} onPress={startListening} activeOpacity={0.85}>
                    <Ionicons name="mic" size={40} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
                <Text style={styles.tapText}>Tap karke bolo / टॅप करून बोला</Text>
                <Text style={styles.subText}>Hindi, Marathi ya English mein</Text>
              </View>
            )}

            {/* ── listening ── */}
            {status === 'listening' && (
              <View style={styles.centeredArea}>
                <Animated.View style={{ transform: [{ scale: anim }] }}>
                  <View style={[styles.bigMic, styles.bigMicRed]}>
                    <Ionicons name="mic" size={40} color="#fff" />
                  </View>
                </Animated.View>
                <Text style={[styles.tapText, { color: '#dc2626' }]}>Sun raha hoon... / ऐकतोय...</Text>
                {/* FIX: show live partial transcript so user knows it's working */}
                {!!liveTranscript && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>Sun raha hoon / ऐकतोय:</Text>
                    <Text style={styles.transcriptText}>{liveTranscript}</Text>
                  </View>
                )}
                {/* FIX: manual stop button — user controls when to end recording */}
                <TouchableOpacity style={styles.stopBtn} onPress={stopListening} activeOpacity={0.8}>
                  <Ionicons name="stop-circle" size={20} color="#fff" />
                  <Text style={styles.stopBtnLabel}>Done Speaking / बोलणे संपले</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── processing ── */}
            {status === 'processing' && (
              <View style={styles.centeredArea}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={[styles.tapText, { marginTop: 14 }]}>AI analyze kar raha hai...</Text>
                {!!transcript && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>Aapne kaha / तुम्ही म्हणालात:</Text>
                    <Text style={styles.transcriptText}>"{transcript}"</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── done ── */}
            {status === 'done' && filledFields && (
              <View>
                <View style={styles.successRow}>
                  <Ionicons name="checkmark-circle" size={26} color="#16a34a" />
                  <Text style={styles.successText}>{filledCount} fields ready! ✅</Text>
                </View>

                {!!transcript && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>Aapne kaha:</Text>
                    <Text style={styles.transcriptText}>"{transcript}"</Text>
                  </View>
                )}

                <ScrollView style={styles.previewBox} nestedScrollEnabled>
                  <Text style={styles.previewTitle}>Ye fields bharenge / हे fields भरतील:</Text>
                  {Object.entries(filledFields).map(([k, v]) => (
                    <View key={k} style={styles.previewRow}>
                      <Text style={styles.previewKey}>{k}:</Text>
                      <Text style={styles.previewVal} numberOfLines={2}>
                        {Array.isArray(v) ? v.join(', ') : String(v)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.doneButtons}>
                  <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                    <Ionicons name="refresh" size={16} color={ORANGE} />
                    <Text style={styles.retryLabel}>Phir bolo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.applyBtn} onPress={applyAndClose}>
                    <Text style={styles.applyLabel}>Form Bharo ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── error ── */}
            {status === 'error' && (
              <View style={styles.centeredArea}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity style={styles.applyBtn} onPress={retry}>
                  <Text style={styles.applyLabel}>Dobara try karo</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* Expo Speech Recognition event bridge — only rendered when speech is
          available and the module is actually imported (SPEECH_AVAILABLE=true) */}
      {/* FIX: keep listener mounted for both 'listening' and 'processing'
           so late 'end' or 'error' events aren't lost when status transitions */}
      {SPEECH_AVAILABLE && (status === 'listening' || status === 'processing') && (
        <ExpoVoiceListener
          onResult={handleSpeechResult}
          onPartial={text => setLiveTranscript(text)}
          onEnd={handleEnd}
          onError={msg => { stopPulse(); setStatus('error'); setErrorMsg(msg); }}
        />
      )}
    </>
  );
}

// ── Expo Speech event bridge (hooks require a component) ────────────────────
// Only functional when SPEECH_AVAILABLE = true and ExpoSpeech is imported.
function ExpoVoiceListener({ onResult, onError }) {
  // When SPEECH_AVAILABLE is false this component is never rendered, so
  // referencing ExpoSpeech here is safe — Metro will tree-shake it away
  // because the conditional above is always false.
  //
  // When you flip SPEECH_AVAILABLE to true, uncomment the import at the
  // top of the file and this hook will work correctly.
  if (!SPEECH_AVAILABLE) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  // Accumulate partial transcripts; only call onResult when speech is final
  // This prevents the modal from processing/closing on every partial word.
  ExpoSpeech.useSpeechRecognitionEvent('result', e => {
    const result = e.results?.[0];
    const text   = result?.transcript || '';
    if (text) onPartial(text);          // show live text in UI
    if (result?.isFinal && text) onResult(text);   // FIX: only fire on final
  });

  // FIX: handle 'end' event — fires when OS stops recognition (silence timeout)
  // Without this, recognition silently stops and UI is stuck on 'listening'
  ExpoSpeech.useSpeechRecognitionEvent('end', () => {
    onEnd();
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  ExpoSpeech.useSpeechRecognitionEvent('error', e => {
    onError('Speech error: ' + (e.message || 'unknown'));
  });
  return null;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ORANGE, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  triggerLabel: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  newBadge:     { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeTxt:  { color: ORANGE, fontSize: 10, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 42 : 24,
    maxHeight: '92%',
  },

  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  sheetTitle:      { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  sheetScreenType: { fontSize: 12, color: ORANGE, fontWeight: '600', marginTop: 2 },
  sheetSub:        { fontSize: 12, color: '#374151', marginBottom: 14, lineHeight: 18 },

  langRow:        { flexDirection: 'row', gap: 10, marginBottom: 14 },
  langChip:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  langChipActive: { borderColor: ORANGE, backgroundColor: '#fff7ed' },
  langFlag:       { fontSize: 15 },
  langLabel:      { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  langLabelActive:{ color: ORANGE },

  hintBox:   { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  hintTitle: { fontSize: 12, fontWeight: '700', color: '#166534', marginBottom: 4 },
  hintText:  { fontSize: 12, color: '#15803d', lineHeight: 18 },

  centeredArea: { alignItems: 'center', paddingVertical: 20, gap: 12 },

  bigMic: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  bigMicRed: { backgroundColor: '#dc2626', shadowColor: '#dc2626' },

  tapText: { fontSize: 14, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  subText:  { fontSize: 12, color: '#9ca3af', textAlign: 'center' },

  transcriptBox:  { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 4 },
  transcriptLabel:{ fontSize: 11, color: '#6b7280', marginBottom: 3 },
  transcriptText: { fontSize: 13, color: '#1f2937', fontStyle: 'italic' },

  successRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  successText: { fontSize: 16, fontWeight: '800', color: '#16a34a' },

  previewBox:   { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, maxHeight: 180, marginBottom: 14 },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  previewRow:   { flexDirection: 'row', gap: 6, marginBottom: 4 },
  previewKey:   { fontSize: 11, fontWeight: '700', color: ORANGE, minWidth: 90, textTransform: 'capitalize' },
  previewVal:   { flex: 1, fontSize: 11, color: '#374151' },

  doneButtons: { flexDirection: 'row', gap: 12 },
  retryBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: ORANGE },
  retryLabel:  { fontSize: 14, fontWeight: '700', color: ORANGE },
  applyBtn:    { flex: 2, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  applyLabel:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  errorText:   { fontSize: 13, color: '#ef4444', textAlign: 'center', lineHeight: 20, marginVertical: 8 },
  stopBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, marginTop: 8 },
  stopBtnLabel:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});
