/**
 * CityPlus — initAds.js
 * The react-native-google-mobile-ads SDK requires an explicit initialize()
 * call before it will serve ANY ad (test or real) — without it, every
 * NativeAd.createForAdRequest() / <BannerAd> request just fails silently.
 * Call this once from App.js on startup.
 */
let started = false;

export function initAds() {
  if (started) return;
  started = true;

  // Guard the import itself, not just the initialize() call. If this APK
  // was built before `react-native-google-mobile-ads` was added to the
  // EAS native build (a JS-only OTA update does NOT add native modules —
  // it needs a fresh `eas build`), `require`-ing the module here throws
  // synchronously with something like "Native module RNGoogleMobileAds
  // not found" instead of quietly resolving. Wrapping it means: (a) the
  // rest of the app doesn't crash, and (b) this exact log line tells you
  // definitively that the binary needs a rebuild, rather than looking
  // like a silent ad-serving problem.
  let mobileAds;
  try {
    mobileAds = require('react-native-google-mobile-ads').default;
  } catch (err) {
    console.log(
      '[ads] Could not load react-native-google-mobile-ads native module. ' +
      'This almost always means the installed app binary predates this ' +
      'module being added to app.config.js — run a fresh `eas build` ' +
      '(a JS/OTA update is not enough) and reinstall. Raw error:',
      err
    );
    return;
  }

  mobileAds()
    .initialize()
    .then(statuses => {
      console.log('[ads] AdMob SDK initialized', statuses);
      // Warm the interstitial/rewarded/rewarded-interstitial pools now so
      // the first navigation-triggered or action-triggered show() call
      // isn't stuck waiting on a fresh network load. App Open ads are
      // started separately via initAppOpenAds() (App.js) since that one
      // also needs to show itself the moment it first loads (cold start).
      try {
        require('./interstitialAds').preloadInterstitial();
        require('./rewardedAds').preloadRewardedAds();
      } catch (err) {
        console.log('[ads] could not preload interstitial/rewarded ads', err);
      }
    })
    .catch(err => {
      console.log('[ads] AdMob SDK failed to initialize', err);
    });
}
