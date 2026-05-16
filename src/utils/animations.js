/**
 * NandedRozgar – Shared animation utilities
 * All built on React Native's built-in Animated API (zero extra deps)
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity } from 'react-native';

// ── FadeSlide: fades in + slides up from `fromY` ─────────────────────────────
export function FadeSlide({ children, delay = 0, fromY = 24, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// ── ScaleIn: pops in from scale 0 ────────────────────────────────────────────
export function ScaleIn({ children, delay = 0, style }) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1, delay, damping: 12, stiffness: 150, useNativeDriver: true }),
      Animated.timing(opacity,{ toValue: 1, duration: 200, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>;
}

// ── PressScale: shrinks slightly on press ─────────────────────────────────────
export function PressScale({ children, onPress, style, scaleDown = 0.95 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: scaleDown, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 250 }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity onPress={press} activeOpacity={1}>{children}</TouchableOpacity>
    </Animated.View>
  );
}

// ── PulseDot: continuously pulsing status dot ─────────────────────────────────
export function PulseDot({ color = '#f97316', size = 8 }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale }] }} />;
}

// ── useCountUp: animates a number from 0 → target ─────────────────────────────
export function useCountUp(target, delay = 0, duration = 900) {
  const anim = useRef(new Animated.Value(0)).current;
  const [value, setValue] = React.useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: target, duration, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, delay);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    return () => { clearTimeout(t); anim.removeListener(id); };
  }, [target]);
  return value;
}

// ── useShimmer: oscillates 0↔1 for border/color shimmer ─────────────────────
export function useShimmer(speed = 1800) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: speed, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: speed, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  return anim;
}

// ── useFloat: floating up-down loop ──────────────────────────────────────────
export function useFloat(amplitude = 8, speed = 1400) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -amplitude, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0,          duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

// ── usePulse: scale up-down loop (for CTA buttons) ───────────────────────────
export function usePulse(min = 1, max = 1.05, speed = 650) {
  const anim = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: max, duration: speed, useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: speed, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

// ── SlideUpModal wrapper ──────────────────────────────────────────────────────
export function useSlideModal(visible) {
  const translateY = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 400, duration: 320,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible]);
  return translateY;
}
