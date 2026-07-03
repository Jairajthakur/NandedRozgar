/**
 * CityPlus — initAds.js
 * The react-native-google-mobile-ads SDK requires an explicit initialize()
 * call before it will serve ANY ad (test or real) — without it, every
 * NativeAd.createForAdRequest() / <BannerAd> request just fails silently.
 * Call this once from App.js on startup.
 */
import mobileAds from 'react-native-google-mobile-ads';

let started = false;

export function initAds() {
  if (started) return;
  started = true;
  mobileAds()
    .initialize()
    .then(statuses => {
      console.log('[ads] AdMob SDK initialized', statuses);
    })
    .catch(err => {
      console.log('[ads] AdMob SDK failed to initialize', err);
    });
}
