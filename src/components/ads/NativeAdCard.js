/**
 * CityPlus — NativeAdCard.js
 * Renders a single AdMob "Native advanced" ad styled like a listing card,
 * so it scrolls with the feed instead of interrupting it.
 *
 * Usage: drop <NativeAdCard /> into a FlatList's data/renderItem the same
 * way BannerCard (sponsored promo) is used in BoardScreen.js.
 *
 * Requires: react-native-google-mobile-ads (native module — needs an EAS
 * rebuild after installing, this cannot run in Expo Go).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { NATIVE_AD_UNIT_ID, ADS_SUPPORTED } from './adConfig';

const ORANGE = '#f97316';

// TEMPORARY debug switch — shows what's actually happening in this ad slot
// (loading / failed + error message) instead of silently rendering nothing.
// Set to false once ads are confirmed working.
const DEBUG_ADS = true;

export default function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState(null);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const adRef = useRef(null);

  useEffect(() => {
    if (!ADS_SUPPORTED) return;
    let cancelled = false;
    console.log('[ads] NativeAdCard mounted, requesting ad', NATIVE_AD_UNIT_ID);

    // createForAdRequest talks to a native module. If the installed binary
    // was built before react-native-google-mobile-ads was linked, calling
    // it can throw synchronously (not as a promise rejection) — wrap the
    // call itself in try/catch so that case is caught and logged too,
    // instead of surfacing as an unrelated blank/crashed screen.
    let request;
    try {
      request = NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID);
    } catch (err) {
      console.log('[ads] NativeAd.createForAdRequest threw synchronously — likely a missing native module, needs a fresh eas build:', err);
      setFailed(true);
      setErrorMsg(String(err?.message || err));
      return;
    }

    request
      .then(ad => {
        if (cancelled) { ad.destroy?.(); return; }
        console.log('[ads] Native ad loaded successfully');
        adRef.current = ad;
        setNativeAd(ad);
      })
      .catch(err => {
        if (!cancelled) {
          console.log('[ads] Native ad failed to load:', err);
          setFailed(true);
          setErrorMsg(String(err?.message || err));
        }
      });

    return () => {
      cancelled = true;
      adRef.current?.destroy?.();
    };
  }, []);

  if (!ADS_SUPPORTED) return null;

  if (DEBUG_ADS && (failed || !nativeAd)) {
    return (
      <View style={styles.debugBox}>
        <Text style={styles.debugTitle}>
          {failed ? '❌ Native ad failed to load' : '⏳ Native ad loading…'}
        </Text>
        <Text style={styles.debugUnit}>Ad unit: {NATIVE_AD_UNIT_ID}</Text>
        {errorMsg ? <Text style={styles.debugErr}>{errorMsg}</Text> : null}
      </View>
    );
  }

  // Render nothing on web, on failure, or while loading — never show a
  // broken/empty ad slot, that's worse than no ad at all.
  if (failed || !nativeAd) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.dot} />
        <Text style={styles.label}>AD</Text>
      </View>

      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <View style={styles.headerRow}>
          {nativeAd.icon?.url ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          ) : null}

          <View style={{ flex: 1 }}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={1}>{nativeAd.headline}</Text>
            </NativeAsset>
            {nativeAd.advertiser ? (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiser} numberOfLines={1}>{nativeAd.advertiser}</Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>

        {nativeAd.mediaContent ? (
          <NativeMediaView style={styles.media} resizeMode="cover" />
        ) : null}

        {nativeAd.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.body} numberOfLines={2}>{nativeAd.body}</Text>
          </NativeAsset>
        ) : null}

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
            </View>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  debugBox: {
    marginHorizontal: 12, marginVertical: 6, padding: 14,
    backgroundColor: '#fff3f3', borderRadius: 12,
    borderWidth: 1, borderColor: '#f5c2c2',
  },
  debugTitle: { fontSize: 13, fontWeight: '700', color: '#c0392b', marginBottom: 4 },
  debugUnit: { fontSize: 11, color: '#888', marginBottom: 2 },
  debugErr: { fontSize: 11, color: '#c0392b' },

  wrap: { marginHorizontal: 12, marginVertical: 6 },
  labelRow: { marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ORANGE },
  label: { fontSize: 9, fontWeight: '800', color: '#bbb', letterSpacing: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon: { width: 36, height: 36, borderRadius: 8 },
  headline: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  advertiser: { fontSize: 12, color: '#999', marginTop: 2 },
  media: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#f2f2f2' },
  body: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 12 },
  ctaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ORANGE,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
