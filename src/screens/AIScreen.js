import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, SectionTitle } from '../components/UI';
import { C, BASE_URL } from '../utils/constants';
import { getToken } from '../utils/api';

export default function AIScreen() {
  const { user, role, jobs } = useAuth();
  const [query, setQuery]       = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading]   = useState(false);

  const isSeeker = false; // All users can use AI match
  const hints = isSeeker
    ? ['Find jobs matching my skills in Nanded','How do I improve my chances of getting hired?',
       'What skills should I learn for better pay?','Which areas in Nanded have most job openings?']
    : ['What salary should I offer for a driver role in Nanded?',
       'Write a compelling job description for a security guard',
       'How many applications should I expect for ₹12,000/month?',
       'Best way to hire quickly in Nanded?'];

  async function askAI() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      // AI calls go through the backend (/api/ai/chat) which holds the API key securely.
      // See src/routes/ai.js on your Railway server.
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ query, role, userLocation: user?.location }),
      });
      const data = await res.json();
      if (data.ok) {
        setResponse(data.reply);
      } else {
        setResponse(data.error || 'Sorry, AI is not available right now.');
      }
    } catch (e) {
      setResponse('Error connecting to AI. Please check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <SectionTitle
        title="AI Career Assistant"
        sub={isSeeker
          ? 'Get smart job recommendations based on your skills'
          : 'Get hiring insights and salary benchmarks for Nanded'}
        style={{ marginBottom: 16 }}
      />

      <Card style={{ marginBottom: 12 }}>
        {/* Hints */}
        {hints.map(q => (
          <TouchableOpacity key={q} onPress={() => setQuery(q)} style={styles.hintBtn}>
            <Text style={styles.hintText}>{q}</Text>
          </TouchableOpacity>
        ))}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything about jobs in Nanded…"
            placeholderTextColor='#bbb'
            value={query}
            onChangeText={setQuery}
            multiline
          />
        </View>
        <Btn label={loading ? 'Thinking…' : 'Ask AI'}
          onPress={askAI} disabled={loading || !query.trim()} />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.aiBox}>
            <ActivityIndicator color={C.dark} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 12, color: C.muted }}>AI is thinking…</Text>
          </View>
        )}

        {/* Response */}
        {response ? (
          <View style={styles.aiBox}>
            <Text style={styles.aiText}>{response}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.contextTitle}>Context Available to AI</Text>
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18 }}>
          AI has access to{' '}
          <Text style={{ fontWeight: '700' }}>
            {jobs.filter(j => j.status === 'active').length}
          </Text>{' '}
          active jobs in Nanded.
          {'\n'}
          {isSeeker
            ? `Your skills: ${(user?.skills || []).join(', ') || 'none listed'}`
            : `Your company: ${user?.company || 'not specified'}`}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  hintBtn: {
    borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 9,
    padding: 10, marginBottom: 8,
  },
  hintText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  inputRow: { marginVertical: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 8,
    padding: 12, fontSize: 13, color: C.text,
    minHeight: 70, textAlignVertical: 'top',
    backgroundColor: '#fff', marginBottom: 10,
  },
  aiBox: {
    backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: '#ddd',
    borderRadius: 10, padding: 14, marginTop: 12,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  aiText: { fontSize: 13, lineHeight: 22, color: '#222', flex: 1 },
  contextTitle: { fontSize: 12, fontWeight: '700', color: C.dark, marginBottom: 6 },
});
