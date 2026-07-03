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
      setIsPremium(active === 'true');
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return isPremium;
}
