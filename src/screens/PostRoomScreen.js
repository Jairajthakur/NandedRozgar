import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const ORANGE = '#f97316';
const ROOM_TYPES = ['1BHK', '2BHK', 'Single Room', 'PG', 'Hostel', 'Studio'];
const FURNISHING = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const PREFERRED   = ['Anyone', 'Males Only', 'Females Only', 'Families Only'];

export default function PostRoomScreen() {
  const nav = useNavigation();
  const [form, setForm] = useState({
    title: '', location: '', type: '1BHK', rent: '',
    deposit: '', furnishing: 'Semi-Furnished', preferred: 'Anyone',
    description: '', phone: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!form.title || !form.location || !form.rent || !form.phone) {
      Alert.alert('Missing Info', 'Please fill all required fields'); return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Toast.show({ type: 'success', text1: '✅ Room listed successfully!' });
      nav.goBack();
    }, 1000);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List a Room / PG</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        <Field label="TITLE *">
          <TextInput style={styles.input} placeholder="e.g. 1BHK Flat – Vazirabad"
            value={form.title} onChangeText={v => set('title', v)} />
        </Field>

        <Field label="LOCATION / AREA *">
          <TextInput style={styles.input} placeholder="e.g. Vazirabad, Shivaji Nagar"
            value={form.location} onChangeText={v => set('location', v)} />
        </Field>

        <Field label="ROOM TYPE">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {ROOM_TYPES.map(t => (
              <TouchableOpacity key={t}
                style={[styles.pill, form.type === t && styles.pillActive]}
                onPress={() => set('type', t)}>
                <Text style={[styles.pillTxt, form.type === t && styles.pillTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="MONTHLY RENT (₹) *" style={{ flex: 1 }}>
            <TextInput style={styles.input} placeholder="e.g. 5500"
              keyboardType="numeric" value={form.rent} onChangeText={v => set('rent', v)} />
          </Field>
          <Field label="DEPOSIT (₹)" style={{ flex: 1 }}>
            <TextInput style={styles.input} placeholder="e.g. 10000"
              keyboardType="numeric" value={form.deposit} onChangeText={v => set('deposit', v)} />
          </Field>
        </View>

        <Field label="FURNISHING">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {FURNISHING.map(f => (
              <TouchableOpacity key={f}
                style={[styles.pill, form.furnishing === f && styles.pillActive]}
                onPress={() => set('furnishing', f)}>
                <Text style={[styles.pillTxt, form.furnishing === f && styles.pillTxtActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="PREFERRED TENANTS">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {PREFERRED.map(p => (
              <TouchableOpacity key={p}
                style={[styles.pill, form.preferred === p && styles.pillActive]}
                onPress={() => set('preferred', p)}>
                <Text style={[styles.pillTxt, form.preferred === p && styles.pillTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="DESCRIPTION">
          <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Describe the room, amenities, nearby facilities..."
            multiline value={form.description} onChangeText={v => set('description', v)} />
        </Field>

        <Field label="CONTACT NUMBER *">
          <TextInput style={styles.input} placeholder="10-digit mobile number"
            keyboardType="phone-pad" maxLength={10}
            value={form.phone} onChangeText={v => set('phone', v)} />
        </Field>

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={submit} disabled={loading}>
          <Text style={styles.submitTxt}>{loading ? 'Listing...' : 'List Room'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111' },
  pill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff' },
  submitBtn: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
