import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const DARK   = '#111111';

// ── Typing indicator ──────────────────────────────────────────
function TypingDots() {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = (d, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.delay(400),
    ]));
    const a0 = anim(d0, 0); const a1 = anim(d1, 160); const a2 = anim(d2, 320);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);
  const dot = (d) => ({
    opacity: d,
    transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });
  return (
    <View style={st.dots}>
      <Animated.View style={[st.dot, dot(d0)]} />
      <Animated.View style={[st.dot, dot(d1)]} />
      <Animated.View style={[st.dot, dot(d2)]} />
    </View>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────
function Bubble({ msg }) {
  const isAI = msg.role === 'assistant';
  return (
    <View style={[st.bubbleRow, isAI ? st.bubbleLeft : st.bubbleRight]}>
      {isAI && (
        <View style={st.avatar}>
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      <View style={[st.bubble, isAI ? st.bubbleAI : st.bubbleUser]}>
        {msg.typing ? (
          <TypingDots />
        ) : (
          <Text style={[st.bubbleTxt, !isAI && { color: '#fff' }]}>{msg.content}</Text>
        )}
        {msg.timestamp && !msg.typing && (
          <Text style={[st.bubbleTime, !isAI && { color: 'rgba(255,255,255,0.6)' }]}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Suggestion Chip ───────────────────────────────────────────
function Chip({ label, onPress }) {
  return (
    <TouchableOpacity style={st.chip} onPress={onPress} activeOpacity={0.75}>
      <Text style={st.chipTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function AIScreen() {
  const { user, jobs } = useAuth();
  const scrollRef      = useRef(null);
  const activeJobs     = jobs.filter(j => j.status === 'active');

  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // ── Suggestions based on live job data ───────────────────────
  const buildSuggestions = useCallback(() => {
    const cats = [...new Set(activeJobs.map(j => j.category).filter(Boolean))];
    return [
      cats[0] ? `Who's hiring for ${cats[0]} right now?` : 'What jobs are live right now?',
      'Give me a salary report for Nanded',
      cats[1] ? `Write a job post for ${cats[1]}` : 'Write a job description template',
      'How can I get more applicants?',
    ];
  }, [activeJobs]);

  // ── Core AI call ──────────────────────────────────────────────
  async function callAI(query, history = []) {
    const data = await http('POST', '/api/ai/chat', {
      query,
      userLocation: user?.location,
      history: history.slice(-8),
    });
    if (data.ok) return data.reply;
    // Surface the real server error in the chat instead of silent fail
    return `⚠️ ${data.error || 'AI unavailable. Please try again.'}`;
  }

  // ── Auto-briefing on mount ────────────────────────────────────
  useEffect(() => {
    setSuggestions(buildSuggestions());

    const name = user?.name?.split(' ')[0] || 'there';
    const greeting = `Hi ${name}! 👋 I'm your NandedRozgar AI assistant. There are ${activeJobs.length} active listings on the platform right now. Ask me anything — jobs, salaries, descriptions, market tips.`;

    setMessages([{ id: 'greeting', role: 'assistant', content: greeting, timestamp: Date.now() }]);

    // Auto-fetch a live snapshot
    (async () => {
      const typingId = 'typing-init';
      setMessages(prev => [...prev, { id: typingId, role: 'assistant', typing: true }]);

      const reply = await callAI(
        `Give me a 2-sentence snapshot of the current Nanded job market based on the active listings. Mention top categories and typical salary ranges.`
      );

      setMessages(prev => prev
        .filter(m => m.id !== typingId)
        .concat(reply ? [{
          id: 'insight-' + Date.now(),
          role: 'assistant',
          content: reply.startsWith('⚠️') ? reply : '📊 ' + reply,
          timestamp: Date.now(),
        }] : [])
      );
    })();
  }, []);

  // ── Send message ──────────────────────────────────────────────
  async function send(text) {
    const q = (text !== undefined ? text : input).trim();
    if (!q || loading) return;
    setInput('');
    setSuggestions([]);

    const userMsg  = { id: 'u-' + Date.now(), role: 'user', content: q, timestamp: Date.now() };
    const typingId = 'typing-' + Date.now();

    setMessages(prev => [...prev, userMsg, { id: typingId, role: 'assistant', typing: true }]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    const history = messages
      .filter(m => !m.typing)
      .map(m => ({ role: m.role, content: m.content }));

    const reply = await callAI(q, [...history, { role: 'user', content: q }]);

    setMessages(prev => prev
      .filter(m => m.id !== typingId)
      .concat([{
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: reply || "Sorry, I couldn't connect. Please try again.",
        timestamp: Date.now(),
      }])
    );

    setSuggestions(buildSuggestions());
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={st.headerIcon}><Text style={{ fontSize: 18 }}>🤖</Text></View>
          <View>
            <Text style={st.headerTitle}>AI Assistant</Text>
            <Text style={st.headerSub}>{activeJobs.length} active listings · Nanded</Text>
          </View>
        </View>
        <View style={st.livePill}>
          <View style={st.liveDot} />
          <Text style={st.liveTxt}>Live data</Text>
        </View>
      </View>

      {/* Chat */}
      <ScrollView
        ref={scrollRef}
        style={st.chat}
        contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

        {suggestions.length > 0 && !loading && (
          <View style={st.chips}>
            <Text style={st.chipsLabel}>Try asking</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {suggestions.map(s => <Chip key={s} label={s} onPress={() => send(s)} />)}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={st.inputBar}>
        <TextInput
          style={st.inputField}
          placeholder="Ask anything about Nanded jobs…"
          placeholderTextColor="#bbb"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={300}
          editable={!loading}
        />
        <TouchableOpacity
          style={[st.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fed7aa',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: DARK },
  headerSub:   { fontSize: 11, color: '#888', marginTop: 1 },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveTxt:     { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  chat: { flex: 1, backgroundColor: '#f8f8f8' },

  bubbleRow:   { flexDirection: 'row', marginBottom: 14, maxWidth: '88%' },
  bubbleLeft:  { alignSelf: 'flex-start', alignItems: 'flex-end' },
  bubbleRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginTop: 2, flexShrink: 0,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  bubble:     { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, maxWidth: '100%', flexShrink: 1 },
  bubbleAI:   { backgroundColor: '#fff', borderBottomLeftRadius: 4, ...C.shadow },
  bubbleUser: { backgroundColor: ORANGE, borderBottomRightRadius: 4 },
  bubbleTxt:  { fontSize: 13, lineHeight: 20, color: DARK },
  bubbleTime: { fontSize: 10, color: '#bbb', marginTop: 4, textAlign: 'right' },

  dots: { flexDirection: 'row', gap: 4, paddingVertical: 4, alignItems: 'center' },
  dot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ddd' },

  chips:      { marginTop: 4, marginBottom: 4 },
  chipsLabel: { fontSize: 10, fontWeight: '700', color: '#bbb', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  chip: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#ebebeb',
  },
  chipTxt: { fontSize: 12, color: DARK, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    padding: 10, gap: 10,
  },
  inputField: {
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 22,
    paddingVertical: 10, paddingHorizontal: 16,
    fontSize: 13, color: DARK, maxHeight: 100,
    borderWidth: 1.5, borderColor: '#ebebeb',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
