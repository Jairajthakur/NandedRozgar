import React, { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// FIX: getToken and BASE_URL are now imported statically at the top of the file.
// Previously they were loaded via `await import()` inside an async function,
// which Metro bundler cannot handle — it threw:
//   AssertionError [ERR_ASSERTION]: Chunk containing module not found: undefined
// Static imports are resolved at bundle time and work correctly with Metro.
import { http, getToken } from '../utils/api';
import { BASE_URL } from '../utils/constants';

const ORANGE = '#f97316';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ChatScreen({ route, navigation }) {
  const { otherId, otherName, jobId, jobTitle } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ headerTitle: otherName || 'Chat' });

    // Bug fix: guard against calling setState on an unmounted component.
    // The previous code had no mounted-flag or AbortController, so if the
    // component unmounted while a fetch was in flight (e.g. user navigated
    // back during the 8-second poll cycle), setMessages / setLoading would
    // fire on the dead component, causing a React warning and a potential
    // memory leak from the lingering interval + pending fetch.
    //
    // Fix: (1) a `mounted` ref that is set to false in the cleanup function
    // so every state call is gated; (2) an AbortController whose signal is
    // passed to every fetch so in-flight requests are cancelled on unmount.
    let mounted = true;
    // Keep the latest AbortController so the interval can cancel the
    // previous request before starting a new one.
    let currentController = null;

    async function load() {
      // Cancel any previous in-flight request before starting the next poll.
      if (currentController) currentController.abort();
      currentController = new AbortController();
      const controller = currentController;

      // http() from api.js does not accept a signal yet, so we call fetch
      // directly here with the abort signal.  The rest of the app can keep
      // using http() unchanged.
      try {
        // FIX: getToken and BASE_URL are now resolved from static imports above
        // instead of via `await import()`, which Metro cannot bundle correctly.
        const token = await getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `${BASE_URL}/api/chat/${otherId}/${jobId || 'null'}`,
          { headers, signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Only update state if the component is still mounted AND this
        // response belongs to the most recent request (not a stale one).
        if (mounted && !controller.signal.aborted) {
          if (data?.ok) setMessages(data.messages || []);
          setLoading(false);
        }
      } catch (err) {
        if (err.name === 'AbortError') return; // expected on unmount / re-poll — ignore
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 8000); // Poll every 8 s

    return () => {
      mounted = false;              // stop all pending setState calls
      clearInterval(interval);      // stop future polls
      if (currentController) currentController.abort(); // cancel in-flight fetch
    };
  }, []);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setSending(true);

    // Optimistic UI
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      receiver_id: otherId,
      content: text,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    const r = await http('POST', `/api/chat/${otherId}/${jobId || 'null'}`, { content: text });
    if (r?.ok) {
      // Replace optimistic with real message
      setMessages(prev => prev.map(m => m.id === optimistic.id ? r.message : m));
    } else {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
    }
    setSending(false);
  }

  // Group messages by day
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const day = formatDate(msg.created_at);
    if (day !== lastDate) { grouped.push({ type: 'date', id: `d-${day}`, label: day }); lastDate = day; }
    grouped.push({ ...msg, type: 'msg' });
  });

  if (loading) return (
    <View style={styles.center}>
      {/* Glossy sheen banner */}
      <LinearGradient colors={['rgba(249,115,22,0.18)', 'rgba(249,115,22,0)']} style={{ height: 4, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />
      <ActivityIndicator color={ORANGE} size="large" />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Job context banner */}
      {jobTitle && (
        <View style={styles.contextBanner}>
          <Ionicons name="briefcase-outline" size={14} color={ORANGE} />
          <Text style={styles.contextTxt} numberOfLines={1}>{jobTitle}</Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={grouped}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 12, gap: 4, paddingBottom: 8 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.type === 'date') return (
            <View style={styles.dateDivider}>
              <Text style={styles.dateTxt}>{item.label}</Text>
            </View>
          );
          const isMine = item.sender_id === user.id;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleTxt, isMine && styles.bubbleTxtMine]}>{item.content}</Text>
              <View style={styles.bubbleMeta}>
                <Text style={[styles.timeStamp, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                  {formatTime(item.created_at)}
                </Text>
                {isMine && (
                  <Ionicons
                    name={item.optimistic ? 'time-outline' : 'checkmark-done'}
                    size={12}
                    color="rgba(255,255,255,0.7)"
                  />
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor="#bbb"
          multiline
          maxLength={1000}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f5f5' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contextBanner:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fed7aa' },
  contextTxt:   { fontSize: 12, color: ORANGE, fontWeight: '600', flex: 1 },
  dateDivider:  { alignItems: 'center', marginVertical: 8 },
  dateTxt:      { fontSize: 11, color: '#aaa', backgroundColor: '#ebebeb', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20 },
  bubble:       { maxWidth: '78%', padding: 10, paddingHorizontal: 14, borderRadius: 18, marginVertical: 2 },
  bubbleMine:   { alignSelf: 'flex-end', backgroundColor: ORANGE, borderBottomRightRadius: 4 },
  bubbleOther:  { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#ebebeb' },
  bubbleTxt:    { fontSize: 14, color: '#111', lineHeight: 20 },
  bubbleTxtMine:{ color: '#fff' },
  bubbleMeta:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, justifyContent: 'flex-end' },
  timeStamp:    { fontSize: 10, color: '#bbb' },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  input:        { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, maxHeight: 100, color: '#111' },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ backgroundColor: '#ddd' },
});
