/**
 * DistrictContext.js
 * Manages the currently selected district (Nanded / Latur).
 * Persisted via expo-secure-store (native) or localStorage (web).
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import storage from '../utils/storage';

const STORAGE_KEY = 'cityplus_selected_district';

export const DISTRICTS = [
  {
    id: 'nanded',
    name: 'Nanded',
    nameMarathi: 'नांदेड',
    state: 'Maharashtra',
    color: '#f97316',
    emoji: '🏙️',
    description: 'Jobs, Rooms, Cars & more in Nanded district',
  },
  {
    id: 'latur',
    name: 'Latur',
    nameMarathi: 'लातूर',
    state: 'Maharashtra',
    color: '#7c3aed',
    emoji: '🌆',
    description: 'Jobs, Rooms, Cars & more in Latur district',
  },
];

const DistrictContext = createContext(null);

export function DistrictProvider({ children }) {
  const [district, setDistrictState] = useState(null); // null = not yet loaded
  const [districtLoading, setDistrictLoading] = useState(true);

  useEffect(() => {
    storage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved && DISTRICTS.find(d => d.id === saved)) {
          setDistrictState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setDistrictLoading(false));
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
