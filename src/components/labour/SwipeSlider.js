/**
 * SwipeSlider.js — "Swipe to confirm" slider (accidental-tap prevention)
 *
 * A worker with sweaty/dirty/gloved hands, in bright sunlight, in a hurry,
 * can easily fat-finger a small button — accidentally accepting a job,
 * checking out too early, or declining work by mistake. A single tap is
 * cheap; dragging a giant slider all the way across is a deliberate,
 * physical action that's very hard to trigger by accident, and (like the
 * iOS "slide to answer" pattern it's modelled on) needs zero reading
 * ability to understand.
 *
 * This replaces plain button confirmations anywhere a worker takes a
 * consequential action: going available, checking in/out, accepting a job.
 *
 * Place at: src/components/labour/SwipeSlider.js
 *
 * Usage:
 *   <SwipeSlider
 *     label="Swipe to accept job"
 *     confirmedLabel="Accepted!"
 *     color="#16a34a"
 *     icon="checkmark"
 *     onConfirm={async () => { const ok = await doAccept(); return ok; }}
 *   />
 *
 * `onConfirm` may return/resolve `false` (or throw) to snap the slider back
 * — e.g. the API call failed — so the worker can just try again.
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THUMB = 60;
const TRACK_PAD = 5;

export default function SwipeSlider({
  label = 'Swipe to confirm',
  confirmedLabel = 'Done!',
  icon = 'chevron-forward',
  color = '#16a34a',
  trackColor,
  height = 70,
  disabled = false,
  onConfirm,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const maxX = Math.max(trackWidth - THUMB - TRACK_PAD * 2, 1);

  const reset = useCallback(() => {
    Animated.spring(x, { toValue: 0, useNativeDriver: !Platform.select({ web: true, default: false }), friction: 7 }).start();
  }, [x]);

  const complete = useCallback(async () => {
    Animated.timing(x, { toValue: maxX, duration: 120, useNativeDriver: false }).start();
    setBusy(true);
    try {
      const result = await onConfirm?.();
      setBusy(false);
      if (result === false) { reset(); return; }
      setConfirmed(true);
    } catch {
      setBusy(false);
      reset();
    }
  }, [maxX, onConfirm, reset, x]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !busy && !confirmed,
      onMoveShouldSetPanResponder: () => !disabled && !busy && !confirmed,
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(Math.max(gesture.dx, 0), maxX);
        x.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx >= maxX * 0.75) {
          complete();
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    })
  ).current;

  const trackBg = trackColor || color + '1a';
  const fillWidth = Animated.add(x, THUMB);

  return (
    <View
      style={[st.track, { height, backgroundColor: trackBg, borderColor: color + '40', opacity: disabled ? 0.5 : 1 }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {/* Filled progress behind the thumb, so the swipe direction is obvious */}
      <Animated.View
        style={[
          st.fill,
          { backgroundColor: color, width: trackWidth ? fillWidth : 0, height },
        ]}
      />

      <Text style={[st.label, { color: confirmed ? '#fff' : color }]} pointerEvents="none">
        {confirmed ? confirmedLabel : label}
      </Text>

      <Animated.View
        {...(disabled || confirmed ? {} : panResponder.panHandlers)}
        style={[
          st.thumb,
          {
            backgroundColor: color,
            width: THUMB - TRACK_PAD * 2,
            height: THUMB - TRACK_PAD * 2,
            transform: [{ translateX: x }],
          },
        ]}
      >
        {busy
          ? <ActivityIndicator size="small" color="#fff" />
          : confirmed
          ? <Ionicons name="checkmark" size={26} color="#fff" />
          : <Ionicons name={icon} size={24} color="#fff" />}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  track: {
    borderRadius: 100, borderWidth: 1.5, justifyContent: 'center',
    paddingHorizontal: TRACK_PAD, overflow: 'hidden', position: 'relative',
  },
  fill: {
    position: 'absolute', left: 0, top: 0, borderRadius: 100,
  },
  label: {
    textAlign: 'center', fontSize: 15, fontWeight: '800', letterSpacing: 0.2,
  },
  thumb: {
    position: 'absolute', left: TRACK_PAD, top: TRACK_PAD, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
});
