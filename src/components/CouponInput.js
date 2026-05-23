/**
 * CouponInput.js
 * Reusable coupon / promo-code input component.
 *
 * Props:
 *   listingType   — 'job' | 'room' | 'vehicle' | 'buysell' | 'promotion'
 *   originalAmount — number (in ₹, not paise)
 *   onApplied(coupon) — called with coupon object when valid, or null when cleared
 *
 * Usage:
 *   <CouponInput
 *     listingType="job"
 *     originalAmount={selectedPlan.price}
 *     onApplied={coupon => setAppliedCoupon(coupon)}
 *   />
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { http } from '../utils/api';

const GREEN  = '#16a34a';
const ORANGE = '#f97316';
const RED    = '#ef4444';
const GRAY   = '#6b7280';
const LIGHT  = '#f3f4f6';
const BORDER = '#e5e7eb';

export default function CouponInput({ listingType = 'job', originalAmount = 0, onApplied }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [applied, setApplied] = useState(null); // coupon object from server

  async function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter a coupon code.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await http('POST', '/api/coupons/validate', {
        code: trimmed,
        listingType,
        originalAmount,
      });

      if (res.ok) {
        setApplied(res.coupon);
        onApplied?.(res.coupon);
        setError('');
      } else {
        setError(res.error || 'Invalid coupon.');
        setApplied(null);
        onApplied?.(null);
      }
    } catch {
      setError('Could not validate coupon. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setCode('');
    setApplied(null);
    setError('');
    onApplied?.(null);
  }

  if (applied) {
    return (
      <View style={s.appliedBox}>
        <View style={s.appliedLeft}>
          <Text style={s.checkmark}>✓</Text>
          <View>
            <Text style={s.appliedCode}>{applied.code}</Text>
            <Text style={s.appliedLabel}>{applied.label} applied!</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClear} style={s.removeBtn}>
          <Text style={s.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={s.row}>
        <TextInput
          style={s.input}
          placeholder="Enter coupon code"
          placeholderTextColor={GRAY}
          value={code}
          onChangeText={v => { setCode(v.toUpperCase()); setError(''); }}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleApply}
        />
        <TouchableOpacity
          style={[s.btn, (!code.trim() || loading) && s.btnDisabled]}
          onPress={handleApply}
          disabled={!code.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.btnText}>Apply</Text>
          }
        </TouchableOpacity>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  btn: {
    height: 46,
    paddingHorizontal: 18,
    backgroundColor: ORANGE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: RED,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  // Applied state
  appliedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkmark: {
    fontSize: 18,
    color: GREEN,
    fontWeight: '700',
  },
  appliedCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 1,
  },
  appliedLabel: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
    marginTop: 1,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  removeText: {
    fontSize: 12,
    color: GRAY,
    fontWeight: '600',
  },
});
