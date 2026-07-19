/**
 * CityPlus — adGate.js
 * Small shared cooldown so the Interstitial and App Open managers never
 * show two full-screen ads back-to-back (e.g. an App Open ad firing on
 * resume half a second before a navigation-triggered Interstitial would
 * have fired). Both managers check/mark this same timestamp instead of
 * tracking their own independent cooldowns.
 */
import { MIN_MS_BETWEEN_FULLSCREEN_ADS } from './adConfig';

let lastFullscreenAdAt = 0;

export function canShowFullscreenAd() {
  return Date.now() - lastFullscreenAdAt >= MIN_MS_BETWEEN_FULLSCREEN_ADS;
}

export function markFullscreenAdShown() {
  lastFullscreenAdAt = Date.now();
}
