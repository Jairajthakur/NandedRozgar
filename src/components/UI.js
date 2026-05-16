import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

// ── Design tokens ──────────────────────────────────────────────
export const GEO = {
  bg:       '#080812',
  surface:  '#0e0e1c',
  card:     'rgba(255,255,255,0.055)',
  border:   'rgba(255,255,255,0.1)',
  orange:   '#f97316',
  indigo:   '#6366f1',
  cyan:     '#22d3ee',
  purple:   '#8b5cf6',
  text:     '#ffffff',
  muted:    'rgba(255,255,255,0.5)',
  dim:      'rgba(255,255,255,0.25)',
};

// ── 3D Glass Card ──────────────────────────────────────────────
export function Card({ children, style, glow, glowColor }) {
  const gc = glowColor || ORANGE;
  return (
    <View style={[
      styles.card,
      glow && { borderColor: gc + '55', shadowColor: gc, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
      style,
    ]}>
      {/* Shimmer top border */}
      <View style={styles.cardTopLine} />
      {children}
    </View>
  );
}

// ── Button ─────────────────────────────────────────────────────
export function Btn({ label, onPress, variant = 'primary', size = 'md', disabled, style, icon }) {
  const configs = {
    primary: { bg: '#1a1a2e', color: '#fff', border: 'rgba(255,255,255,0.15)' },
    orange:  { bg: ORANGE, color: '#fff', border: ORANGE, glow: true },
    outline: { bg: 'transparent', color: GEO.muted, border: 'rgba(255,255,255,0.15)' },
    danger:  { bg: '#7f1d1d', color: '#fca5a5', border: '#ef4444' },
    gray:    { bg: 'rgba(255,255,255,0.08)', color: GEO.muted, border: 'rgba(255,255,255,0.1)' },
    indigo:  { bg: INDIGO, color: '#fff', border: INDIGO, glow: true },
  };
  const c = configs[variant] || configs.primary;
  const pad = size === 'sm' ? { paddingVertical: 8, paddingHorizontal: 16 }
            : size === 'lg' ? { paddingVertical: 15, paddingHorizontal: 26 }
            :                 { paddingVertical: 12, paddingHorizontal: 20 };
  const fsize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[{
        backgroundColor: c.bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        opacity: disabled ? 0.4 : 1,
        shadowColor: c.glow ? c.bg : 'transparent',
        shadowOpacity: c.glow ? 0.5 : 0,
        shadowRadius: 10,
        elevation: c.glow ? 6 : 0,
        ...pad,
      }, style]}
    >
      {icon && <Text style={{ fontSize: fsize }}>{icon}</Text>}
      <Text style={{ color: c.color, fontWeight: '700', fontSize: fsize, letterSpacing: 0.3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Input ──────────────────────────────────────────────────────
export function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && { borderColor: '#ef4444' }, inputStyle]}
        placeholderTextColor="rgba(255,255,255,0.25)"
        {...props}
      />
      {error ? <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

// ── Chip ───────────────────────────────────────────────────────
export function Chip({ label, variant = 'gray', iconName, style }) {
  const bg    = variant === 'orange' ? 'rgba(249,115,22,0.18)'
             : variant === 'blue'   ? 'rgba(99,102,241,0.18)'
             : variant === 'green'  ? 'rgba(34,197,94,0.15)'
             : variant === 'red'    ? 'rgba(239,68,68,0.15)'
             : 'rgba(255,255,255,0.08)';
  const color = variant === 'orange' ? ORANGE
             : variant === 'blue'   ? '#818cf8'
             : variant === 'green'  ? '#4ade80'
             : variant === 'red'    ? '#f87171'
             : GEO.dim;
  return (
    <View style={[{
      backgroundColor: bg,
      borderRadius: 20, paddingVertical: 4,
      paddingHorizontal: 10, alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: color + '33',
    }, style]}>
      {iconName && <Ionicons name={iconName} size={10} color={color} />}
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 'large', color = ORANGE }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ── Empty State ────────────────────────────────────────────────
export function Empty({ icon = 'search', title, sub, action, actionLabel }) {
  return (
    <View style={{ alignItems: 'center', padding: 60 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 16,
        backgroundColor: 'rgba(249,115,22,0.1)',
        borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Ionicons name={icon} size={28} color={ORANGE} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: GEO.text, marginBottom: 6 }}>{title}</Text>
      {sub && <Text style={{ fontSize: 13, color: GEO.muted, textAlign: 'center', lineHeight: 20 }}>{sub}</Text>}
      {action && (
        <Btn label={actionLabel} onPress={action} variant="orange" style={{ marginTop: 18 }} />
      )}
    </View>
  );
}

// ── Section Title ──────────────────────────────────────────────
export function SectionTitle({ title, sub, style }) {
  return (
    <View style={style}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: GEO.text, letterSpacing: 0.2 }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, color: GEO.muted, marginTop: 3, lineHeight: 18 }}>{sub}</Text>}
    </View>
  );
}

// ── Geo Tag ────────────────────────────────────────────────────
export function GeoTag({ label, color = ORANGE }) {
  return (
    <View style={{
      borderWidth: 1, borderColor: color + '44',
      backgroundColor: color + '15',
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 6,
    }}>
      <Text style={{ fontSize: 10, color, fontWeight: '700', letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GEO.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GEO.border,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardTopLine: {
    position: 'absolute', top: 0, left: 24, right: 24, height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  label: {
    fontSize: 11, fontWeight: '700',
    color: GEO.muted,
    marginBottom: 6, letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5, borderColor: GEO.border,
    borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: GEO.text,
  },
});

// Re-export C for backward compatibility
export const C = {
  bg: GEO.bg, card: GEO.surface, border: GEO.border,
  text: GEO.text, muted: GEO.muted, dark: '#fff',
  dark2: GEO.muted, dark3: GEO.dim, gray: GEO.muted,
  grayLight: GEO.surface, orange: ORANGE, radius: 14,
  shadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
};
