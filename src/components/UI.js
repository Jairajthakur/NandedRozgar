import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { C } from '../utils/constants';

const ORANGE = '#f97316';

// ── Button ────────────────────────────────────────────────────
export function Btn({ label, onPress, variant = 'primary', size = 'md', disabled, style, icon }) {
  const bg = variant === 'primary' ? '#111'
    : variant === 'orange'  ? ORANGE
    : variant === 'outline' ? 'transparent'
    : variant === 'danger'  ? '#ef4444'
    : variant === 'gray'    ? '#f0f0f0'
    : '#111';

  const color = variant === 'outline' ? '#111'
    : variant === 'gray'   ? '#555'
    : '#fff';

  const border = variant === 'outline' ? { borderWidth: 1.5, borderColor: '#ddd' } : {};
  const pad = size === 'sm' ? { paddingVertical: 7, paddingHorizontal: 14 }
            : size === 'lg' ? { paddingVertical: 14, paddingHorizontal: 24 }
            : { paddingVertical: 11, paddingHorizontal: 18 };
  const fsize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[{ backgroundColor: bg, borderRadius: 10, alignItems: 'center',
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
        style={[styles.input, error && { borderColor: '#ef4444' }, inputStyle]}
        placeholderTextColor="#bbb"
        {...props}
      />
      {error ? <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{error}</Text> : null}
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
  const bg    = variant === 'orange' ? '#fff7ed'
             : variant === 'blue'   ? '#eff6ff'
             : variant === 'green'  ? '#f0fdf4'
             : variant === 'red'    ? '#fef2f2'
             : '#f0f0f0';
  const color = variant === 'orange' ? ORANGE
             : variant === 'blue'   ? '#1d4ed8'
             : variant === 'green'  ? '#166534'
             : variant === 'red'    ? '#dc2626'
             : '#555';
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 20, paddingVertical: 3,
      paddingHorizontal: 10, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'large', color = ORANGE }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ icon = 'search', title, sub, action, actionLabel }) {
  return (
    <View style={{ alignItems: 'center', padding: 60 }}>
      <Ionicons name={icon} size={40} color="#ccc" style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 }}>{title}</Text>
      {sub && <Text style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>{sub}</Text>}
      {action && (
        <Btn label={actionLabel} onPress={action} variant="orange" style={{ marginTop: 16 }} />
      )}
    </View>
  );
}

// ── Section Title ─────────────────────────────────────────────
export function SectionTitle({ title, sub, style }) {
  return (
    <View style={style}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#111' }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 5, letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 14, fontSize: 13,
    backgroundColor: '#fff', color: '#111',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ebebeb',
    padding: 16,
  },
});
