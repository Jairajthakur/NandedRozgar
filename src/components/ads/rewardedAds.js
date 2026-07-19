/**
 * CityPlus — rewardedAds.js
 * Preloads and shows both reward-based formats:
 *  - Rewarded: opt-in "Watch an ad" button (e.g. LabourEarningsScreen's
 *    ad-bonus button) — the user explicitly chooses to watch.
 *  - Rewarded interstitial: offered at a natural breakpoint (e.g. right
 *    after marking a hire completed) without a dedicated button first.
 *
 * Both share the same load/show/preload-next shape, so one factory
 * builds both managers. showRewarded()/showRewardedInterstitial() resolve
 * to `true` only if the user actually earned the reward (watched through
 * to completion) — closing early resolves `false` and nothing should be
 * credited.
 */
import { REWARDED_AD_UNIT_ID, REWARDED_INTERSTITIAL_AD_UNIT_ID, ADS_SUPPORTED } from './adConfig';

let RewardedAd, RewardedInterstitialAd, RewardedAdEventType, AdEventType;
try {
  ({ RewardedAd, RewardedInterstitialAd, RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads'));
} catch (err) {
  console.log('[ads] rewardedAds: could not load react-native-google-mobile-ads', err);
}

function makeManager(AdClass, unitId, label) {
  let ad = null;
  let isLoaded = false;

  function load() {
    if (!ADS_SUPPORTED || !AdClass) return;
    ad = AdClass.createForAdRequest(unitId);
    isLoaded = false;

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoaded = true;
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, err => {
      console.log(`[ads] ${label} failed to load`, err);
      isLoaded = false;
    });
    ad.load();

    return { unsubLoaded, unsubError };
  }

  load();

  return {
    isReady: () => !!(ADS_SUPPORTED && AdClass && ad && isLoaded),
    show: () => new Promise(resolve => {
      if (!ADS_SUPPORTED || !AdClass || !ad || !isLoaded) {
        resolve(false);
        return;
      }
      let earned = false;
      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubEarned();
        unsubClosed();
        isLoaded = false;
        load(); // preload the next one
        resolve(earned);
      });
      ad.show();
    }),
  };
}

let rewardedManager = null;
let rewardedInterstitialManager = null;

/** Call once at app startup (from initAds.js) to warm both ad types. */
export function preloadRewardedAds() {
  if (!ADS_SUPPORTED) return;
  if (!rewardedManager) rewardedManager = makeManager(RewardedAd, REWARDED_AD_UNIT_ID, 'rewarded');
  if (!rewardedInterstitialManager) {
    rewardedInterstitialManager = makeManager(RewardedInterstitialAd, REWARDED_INTERSTITIAL_AD_UNIT_ID, 'rewarded interstitial');
  }
}

export function isRewardedReady() {
  preloadRewardedAds();
  return !!rewardedManager?.isReady();
}

/** Resolves true only if the user watched through and earned the reward. */
export function showRewarded() {
  preloadRewardedAds();
  return rewardedManager ? rewardedManager.show() : Promise.resolve(false);
}

export function isRewardedInterstitialReady() {
  preloadRewardedAds();
  return !!rewardedInterstitialManager?.isReady();
}

/** Resolves true only if the user watched through and earned the reward. */
export function showRewardedInterstitial() {
  preloadRewardedAds();
  return rewardedInterstitialManager ? rewardedInterstitialManager.show() : Promise.resolve(false);
}
