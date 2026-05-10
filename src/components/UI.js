import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { C } from '../utils/constants';

// ── Button ────────────────────────────────────────────────────
export function Btn({ label, onPress, variant = 'primary', size = 'md', disabled, style, icon }) {
  const bg = variant === 'primary' ? C.dark
    : variant === 'outline' ? 'transparent'
    : variant === 'gold'    ? C.dark2
    : variant === 'danger'  ? C.dark2
    : variant === 'gray'    ? C.grayLight
    : C.dark;

  const color = variant === 'outline' ? C.dark
    : variant === 'gray'   ? C.muted
    : '#fff';

  const border = variant === 'outline' ? { borderWidth: 1.5, borderColor: C.dark } : {};
  const pad = size === 'sm' ? { paddingVertical: 6, paddingHorizontal: 13 }
            : size === 'lg' ? { paddingVertical: 14, paddingHorizontal: 24 }
            : { paddingVertical: 10, paddingHorizontal: 18 };
  const fsize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[{ backgroundColor: bg, borderRadius: 9, alignItems: 'center',
        justifyContent: 'center', flexDirection: 'row', gap: 6,
        opacity: disabled ? 0.45 : 1, ...border, ...pad }, style]}
      activeOpacity={0.8}
    >
      {icon && <Text style={{ fontSize: fsize }}>{icon}</Text>}
      <Text style={{ color, fontWeight: '700', fontSize: fsize }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && { borderColor: '#e55' }, inputStyle]}
        placeholderTextColor={C.muted}
        {...props}
      />
      {error ? <Text style={{ color: '#e55', fontSize: 11, marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style, shadow }) {
  return (
    <View style={[styles.card, shadow && C.shadow, style]}>
      {children}
    </View>
  );
}

// ── Chip ──────────────────────────────────────────────────────
export function Chip({ label, variant = 'gray', style }) {
  const bg = variant === 'gold' ? '#e8e8e8'
           : variant === 'blue' ? '#eeeeee'
           : variant === 'green' ? '#dcfce7'
           : variant === 'red'  ? '#e8e8e8'
           : '#f0f0f0';
  const color = variant === 'green' ? '#166534' : C.text;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 20, paddingVertical: 3,
      paddingHorizontal: 10, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'large', color = C.dark }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ icon = '🔍', title, sub, action, actionLabel }) {
  return (
    <View style={{ alignItems: 'center', padding: 60 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#444', marginBottom: 6 }}>{title}</Text>
      {sub && <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>{sub}</Text>}
      {action && (
        <Btn label={actionLabel} onPress={action} style={{ marginTop: 16 }} />
      )}
    </View>
  );
}

// ── Section Title ─────────────────────────────────────────────
export function SectionTitle({ title, sub, style }) {
  return (
    <View style={style}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 5, letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 13, fontSize: 13,
    backgroundColor: '#fff', color: C.text,
  },
  card: {
    backgroundColor: C.card, borderRadius: C.radius,
    borderWidth: 1, borderColor: C.border,
    padding: 16,
  },
});
