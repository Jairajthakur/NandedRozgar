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

// Icon names for @expo/vector-icons Ionicons
export const CAT_ICONS = {
  Construction:'construct-outline', Driver:'car-outline', 'Domestic Help':'home-outline', Security:'shield-checkmark-outline',
  Delivery:'cube-outline', 'Shop Assistant':'bag-handle-outline', Plumber:'water-outline', Electrician:'flash-outline',
  Carpenter:'hammer-outline', Painter:'color-palette-outline', Other:'briefcase-outline',
};

// ─── Duration-based listing plans ────────────────────────────────────────────
// Each plan: { days, price, label, popular?, free? }
// After `days` the listing is automatically deleted from the app.
export const JOB_PLANS = [
  { days: 7,  price: 49,  label: '7 Days',   popular: false },
  { days: 15, price: 79,  label: '15 Days',  popular: true  },
  { days: 30, price: 119, label: '30 Days',  popular: false },
];

// ─── Free test plan (shown only to premium/test users) ───────────────────────
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

// ✏️ CHANGE THIS to your Railway URL after deploying!
export const BASE_URL = 'https://nandedrozgar-production.up.railway.app';
