/**
 * CityPlus — useIsPremium.js
 * Reads the same 'monthly_plan_active' flag MonthlyPlanScreen writes,
 * so any screen (e.g. ad placements) can cheaply check subscription status
 * without re-fetching from the server. Refreshes when the screen regains
 * focus, so it picks up a just-completed purchase.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export function useIsPremium() {
  const [isPremium, setIsPremium] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const active = await AsyncStorage.getItem('monthly_plan_active');
      // Diagnostic: a stale 'true' left over from earlier testing is a
      // common, completely silent reason every ad slot (native + banner)
      // disappears — this line makes that visible in logcat instead of
      // looking like an ad-serving bug.
      console.log('[ads] monthly_plan_active =', active, '→ isPremium =', active === 'true');
      setIsPremium(active === 'true');
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return isPremium;
}
