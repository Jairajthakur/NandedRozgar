/**
 * SOSButton.js — Emergency Alert SOS Button
 *
 * A one-tap safety net for the active-job interface. Tapping it:
 *   1. Grabs a best-effort GPS fix
 *   2. Logs an SOS alert to POST /api/sos/trigger (which also push-notifies
 *      the hiring contractor if this SOS is tied to a hire)
 *   3. Shows the worker's saved emergency contacts so they can tap-to-call
 *      immediately
 *   4. Still offers the national emergency helpline (112) as a fallback,
 *      exactly like the existing quick-dial button elsewhere in the app
 *
 * Backend: src/routes/sos.js, mounted at /api/sos.
 * Place at: src/components/labour/SOSButton.js
 *
 * Usage:
 *   <SOSButton hireRequestId={hr.id} />
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const EMERGENCY_NUMBER = '112';

async function tryGetLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

function callNumber(number) {
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert('Could not open dialer', `Please dial ${number} directly.`)
  );
}

export default function SOSButton({ hireRequestId }) {
  const [sending, setSending] = useState(false);

  const trigger = async () => {
    setSending(true);
    const coords = await tryGetLocation();
    const res = await http('POST', '/api/sos/trigger', {
      hireRequestId,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setSending(false);

    if (!res?.ok) {
      Toast.show({ type: 'error', text1: 'Could not send SOS alert', text2: res?.error || 'Try calling 112 directly.' });
      callNumber(EMERGENCY_NUMBER);
      return;
    }

    const contacts = res.emergencyContacts || {};
    const hasContact = !!contacts.phone;

    Alert.alert(
      '🚨 SOS alert sent',
      hasContact
        ? `Your location was logged and ${contacts.name || 'your emergency contact'} has been listed to call. If this is a medical or safety emergency, call them or 112 right now.`
        : 'Your location was logged. You have no emergency contact saved — add one from your profile. If this is urgent, call 112 now.',
      [
        ...(hasContact ? [{ text: `Call ${contacts.name || 'contact'}`, onPress: () => callNumber(contacts.phone) }] : []),
        { text: `Call ${EMERGENCY_NUMBER}`, style: 'destructive', onPress: () => callNumber(EMERGENCY_NUMBER) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const confirm = () => {
    Alert.alert(
      'Send SOS alert?',
      'This logs your location, alerts your emergency contact, and notifies the contractor on this job. Use this if you feel unsafe or are hurt.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: trigger },
      ]
    );
  };

  return (
    <TouchableOpacity style={st.btn} onPress={confirm} disabled={sending} activeOpacity={0.85}>
      {sending
        ? <ActivityIndicator size="small" color="#dc2626" />
        : <Ionicons name="alert-circle" size={16} color="#dc2626" />}
      <Text style={st.txt}>{sending ? 'Sending…' : 'SOS'}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: RADIUS.pill, paddingVertical: 9, paddingHorizontal: 16,
  },
  txt: { fontSize: 13, fontWeight: '800', color: '#dc2626' },
});
