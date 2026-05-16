import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

function FloatShape({ style, delay = 0, duration = 6000 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '15deg'] });
  return (
    <Animated.View style={[style, { transform: [{ translateY }, { rotate }] }]} />
  );
}

export function GeoTriangle({ size = 40, color = 'rgba(249,115,22,0.18)', style }) {
  return (
    <View style={[{
      width: 0, height: 0,
      borderLeftWidth: size / 2, borderRightWidth: size / 2,
      borderBottomWidth: size * 0.87,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderBottomColor: color,
    }, style]} />
  );
}

export function GeoDiamond({ size = 36, color = 'rgba(99,102,241,0.2)', style }) {
  return (
    <View style={[{
      width: size, height: size,
      backgroundColor: color,
      transform: [{ rotate: '45deg' }],
    }, style]} />
  );
}

export function GeoHexagon({ size = 44, color = 'rgba(34,211,238,0.12)', style }) {
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <View style={{
        width: size,
        height: size * 0.58,
        backgroundColor: color,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
      }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderTopWidth: size * 0.3,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: color,
      }} />
    </View>
  );
}

export function GeoCircle({ size = 60, color = 'rgba(249,115,22,0.08)', style }) {
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
    }, style]} />
  );
}

export function GeoRing({ size = 80, color = 'rgba(99,102,241,0.15)', strokeWidth = 2, style }) {
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: strokeWidth, borderColor: color,
      backgroundColor: 'transparent',
    }, style]} />
  );
}

export default function GeometricBg({ variant = 'dark' }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <FloatShape delay={0} duration={7000}
        style={[styles.abs, { top: 60, right: -20,
          width: 0, height: 0,
          borderLeftWidth: 55, borderRightWidth: 55,
          borderBottomWidth: 95,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: 'rgba(249,115,22,0.12)',
        }]}
      />
      <FloatShape delay={1500} duration={9000}
        style={[styles.abs, { top: 140, left: -30,
          width: 70, height: 70,
          backgroundColor: 'rgba(99,102,241,0.1)',
          transform: [{ rotate: '45deg' }],
        }]}
      />
      <FloatShape delay={3000} duration={8000}
        style={[styles.abs, { top: H * 0.3, right: 30,
          width: 50, height: 50, borderRadius: 25,
          borderWidth: 2, borderColor: 'rgba(34,211,238,0.18)',
          backgroundColor: 'transparent',
        }]}
      />
      <FloatShape delay={500} duration={10000}
        style={[styles.abs, { top: H * 0.5, left: 20,
          width: 0, height: 0,
          borderLeftWidth: 30, borderRightWidth: 30,
          borderBottomWidth: 52,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: 'rgba(139,92,246,0.15)',
        }]}
      />
      <FloatShape delay={2000} duration={7500}
        style={[styles.abs, { bottom: 120, right: -15,
          width: 80, height: 80,
          backgroundColor: 'rgba(249,115,22,0.06)',
          transform: [{ rotate: '30deg' }],
        }]}
      />
      <FloatShape delay={4000} duration={6500}
        style={[styles.abs, { bottom: 200, left: 40,
          width: 35, height: 35, borderRadius: 17.5,
          borderWidth: 2, borderColor: 'rgba(249,115,22,0.2)',
          backgroundColor: 'transparent',
        }]}
      />
      <FloatShape delay={1000} duration={11000}
        style={[styles.abs, { top: H * 0.65, right: 60,
          width: 0, height: 0,
          borderLeftWidth: 20, borderRightWidth: 20,
          borderBottomWidth: 34,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: 'rgba(34,211,238,0.1)',
        }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
