export const C = {
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#ebebeb',
  text: '#111111',
  muted: '#888888',
  dark: '#111111',
  dark2: '#333333',
  dark3: '#555555',
  gray: '#888888',
  grayLight: '#f5f5f5',
  grayLighter: '#efefef',
  orange: '#f97316',
  radius: 14,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const CATS = ['All','Construction','Driver','Domestic Help','Security','Delivery','Shop Assistant','Plumber','Electrician','Carpenter','Painter','Other'];

export const CAT_ICONS = {
  Construction:'construct-outline', Driver:'car-outline', 'Domestic Help':'home-outline', Security:'shield-checkmark-outline',
  Delivery:'cube-outline', 'Shop Assistant':'bag-handle-outline', Plumber:'water-outline', Electrician:'flash-outline',
  Carpenter:'hammer-outline', Painter:'color-palette-outline', Other:'briefcase-outline',
};

export const JOB_PLANS = [
  { days: 7,  price: 49,  label: '7 Days',   popular: false },
  { days: 15, price: 79,  label: '15 Days',  popular: true  },
  { days: 30, price: 119, label: '30 Days',  popular: false },
];

export const FREE_TEST_PLAN = { days: 30, price: 0, label: 'Free Test', popular: false, free: true };
export const CAR_PLANS = [
  { days: 15, price: 69,  label: '15 Days',  popular: false },
  { days: 30, price: 99,  label: '1 Month',  popular: true  },
  { days: 60, price: 169, label: '2 Months', popular: false },
  { days: 90, price: 229, label: '3 Months', popular: false },
];
export const ROOM_PLANS = [
  { days: 15, price: 69,  label: '15 Days',  popular: false },
  { days: 30, price: 99,  label: '1 Month',  popular: true  },
  { days: 60, price: 169, label: '2 Months', popular: false },
  { days: 90, price: 229, label: '3 Months', popular: false },
];
export const BUYSELL_PLANS = [
  { days: 7,  price: 39,  label: '7 Days',   popular: false },
  { days: 15, price: 59,  label: '15 Days',  popular: true  },
  { days: 30, price: 89,  label: '30 Days',  popular: false },
];

export const PRICING = {
  basic: 49,
  featured: 49,
  urgent: 29,
  bundle: 69,
  pro_monthly: 499,
  pro_quarterly: 1199,
  whatsapp_blast: 99,
  banner_monthly: 299,
};

// FIX #20 — Use environment-aware BASE_URL instead of hardcoding the production URL.
// In app.config.js set: extra: { apiUrl: process.env.API_URL || 'http://localhost:3000' }
// Then read it here via expo-constants.
import Constants from 'expo-constants';
export const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';
