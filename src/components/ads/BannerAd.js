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
import { View, StyleSheet } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID, ADS_SUPPORTED } from './adConfig';

export default function BannerAd({ style }) {
  const [failed, setFailed] = useState(false);

  // Render nothing on web or if the ad failed to load — an empty banner
  // slot with no content looks broken, so we just collapse it away.
  if (!ADS_SUPPORTED || failed) return null;

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
  wrap: { alignItems: 'center', paddingVertical: 12 },
});
