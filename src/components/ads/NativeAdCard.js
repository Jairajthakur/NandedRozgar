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

export default function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState(null);
  const [failed, setFailed] = useState(false);
  const adRef = useRef(null);

  useEffect(() => {
    if (!ADS_SUPPORTED) return;
    let cancelled = false;

    NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID)
      .then(ad => {
        if (cancelled) { ad.destroy?.(); return; }
        adRef.current = ad;
        setNativeAd(ad);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      adRef.current?.destroy?.();
    };
  }, []);

  // Render nothing on web, on failure, or while loading — never show a
  // broken/empty ad slot, that's worse than no ad at all.
  if (!ADS_SUPPORTED || failed || !nativeAd) return null;

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
