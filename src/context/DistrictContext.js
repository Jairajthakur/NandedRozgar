/**
 * DistrictContext.js
 * Manages the currently selected district (Nanded / Latur).
 * On first launch → auto-detects from GPS; falls back to 'nanded'.
 * Persisted via expo-secure-store (native) or localStorage (web).
 * User can change district only from HomeScreen.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import storage from '../utils/storage';

const STORAGE_KEY = 'cityplus_selected_district';

export const DISTRICTS = [
  {
    id: 'nanded',
    name: 'Nanded',
    nameMarathi: 'नांदेड',
    nameHindi: 'नांदेड',
    state: 'Maharashtra',
    color: '#f97316',
    emoji: '🏙️',
    description: 'Jobs, Rooms, Cars & more in Nanded district',
  },
  {
    id: 'latur',
    name: 'Latur',
    nameMarathi: 'लातूर',
    nameHindi: 'लातूर',
    state: 'Maharashtra',
    color: '#7c3aed',
    emoji: '🌆',
    description: 'Jobs, Rooms, Cars & more in Latur district',
  },
];

/**
 * Rough bounding boxes for each district (lat/lng ranges).
 * Good enough for auto-detection without a reverse-geocoding API call.
 */
const DISTRICT_BOUNDS = {
  nanded: { latMin: 17.8, latMax: 19.4, lngMin: 76.8, lngMax: 78.0 },
  latur:  { latMin: 17.4, latMax: 18.5, lngMin: 76.1, lngMax: 77.4 },
};

function detectDistrictFromCoords(lat, lng) {
  for (const [id, b] of Object.entries(DISTRICT_BOUNDS)) {
    if (lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax) {
      return id;
    }
  }
  return 'nanded'; // default fallback
}

async function autoDetectDistrict() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'nanded';
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    });
    return detectDistrictFromCoords(loc.coords.latitude, loc.coords.longitude);
  } catch {
    return 'nanded';
  }
}

const DistrictContext = createContext(null);

export function DistrictProvider({ children }) {
  const [district, setDistrictState] = useState(null); // null = not yet loaded
  const [districtLoading, setDistrictLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY);
        if (saved && DISTRICTS.find(d => d.id === saved)) {
          // User previously chose a district — honour it
          setDistrictState(saved);
        } else {
          // First launch: try GPS, fall back to nanded silently
          const detected = await autoDetectDistrict();
          setDistrictState(detected);
          await storage.setItem(STORAGE_KEY, detected);
        }
      } catch {
        setDistrictState('nanded');
      } finally {
        setDistrictLoading(false);
      }
    })();
  }, []);

  async function selectDistrict(id) {
    const valid = DISTRICTS.find(d => d.id === id);
    if (!valid) return;
    setDistrictState(id);
    await storage.setItem(STORAGE_KEY, id);
  }

  async function clearDistrict() {
    setDistrictState(null);
    await storage.removeItem(STORAGE_KEY);
  }

  const currentDistrict = DISTRICTS.find(d => d.id === district) || null;

  return (
    <DistrictContext.Provider value={{
      district,           // string id e.g. 'nanded'
      currentDistrict,    // full object from DISTRICTS
      districtLoading,
      selectDistrict,
      clearDistrict,
      DISTRICTS,
    }}>
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  const ctx = useContext(DistrictContext);
  if (!ctx) throw new Error('useDistrict must be inside DistrictProvider');
  return ctx;
}
