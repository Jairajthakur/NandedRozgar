/**
 * CityPlus — BannerAd.js
 * Standard AdMob banner. Rendered as a ListFooterComponent (scrolls with
 * content, appears once at the end of a feed) rather than pinned to the
 * bottom of the screen — a pinned banner would sit on top of the bottom
 * tab bar on some devices and permanently eat screen space. This way it
 * only shows up when someone scrolls to the end, which is far less
 * intrusive while still getting impressions.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID, ADS_SUPPORTED } from './adConfig';

// TEMPORARY debug switch — see NativeAdCard.js for details.
const DEBUG_ADS = true;

export default function BannerAd({ style }) {
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loaded, setLoaded] = useState(false);

  if (!ADS_SUPPORTED) return null;

  console.log('[ads] BannerAd rendering, requesting', BANNER_AD_UNIT_ID);

  if (DEBUG_ADS && (failed || !loaded)) {
    return (
      <View style={[styles.debugBox, style]}>
        <Text style={styles.debugTitle}>
          {failed ? '❌ Banner ad failed to load' : '⏳ Banner ad loading…'}
        </Text>
        <Text style={styles.debugUnit}>Ad unit: {BANNER_AD_UNIT_ID}</Text>
        {errorMsg ? <Text style={styles.debugErr}>{errorMsg}</Text> : null}
        {/* Keep the real component mounted underneath so it can still load and flip `loaded` */}
        <View style={{ opacity: 0, height: 0, overflow: 'hidden' }}>
          <GoogleBannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdLoaded={() => { console.log('[ads] Banner ad loaded'); setLoaded(true); }}
            onAdFailedToLoad={err => {
              console.log('[ads] Banner ad failed to load:', err);
              setFailed(true);
              setErrorMsg(String(err?.message || err));
            }}
          />
        </View>
      </View>
    );
  }

  // Render nothing on web or if the ad failed to load — an empty banner
  // slot with no content looks broken, so we just collapse it away.
  if (failed) return null;

  return (
    <View style={[styles.wrap, style]}>
      <GoogleBannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  debugBox: {
    marginHorizontal: 12, marginVertical: 8, padding: 14,
    backgroundColor: '#fff3f3', borderRadius: 12,
    borderWidth: 1, borderColor: '#f5c2c2',
  },
  debugTitle: { fontSize: 13, fontWeight: '700', color: '#c0392b', marginBottom: 4 },
  debugUnit: { fontSize: 11, color: '#888', marginBottom: 2 },
  debugErr: { fontSize: 11, color: '#c0392b' },

  wrap: { alignItems: 'center', paddingVertical: 12 },
});
