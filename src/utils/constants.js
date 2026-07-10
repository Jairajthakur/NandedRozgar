import Constants from 'expo-constants';

// ── Feature flags ─────────────────────────────────────────────────────────────
// Flip a flag to `true` to launch that feature app-wide. While `false`, every
// screen/route tied to it renders the shared <ComingSoonScreen> instead
// (see App.js) — no other code needs to change to go live later.
export const FEATURES = {
  LABOUR_ENABLED: true, // TEMP: enabled for internal APK testing only — set back to false before any production/Play Store build
};

export const C = {
  orange: '#f97316',
  black:  '#111111',
  gray:   '#f5f5f5',
  border: '#ebebeb',
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
};

// Ensure BASE_URL always has a scheme — guards against eas.json env values
// accidentally missing 'https://' (e.g. "localloops-production.up.railway.app"
// instead of "https://thecityplus.in").
const _rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'https://thecityplus.in';
export const BASE_URL = _rawApiUrl.startsWith('http') ? _rawApiUrl : `https://${_rawApiUrl}`;

// TODO: replace with the real handle for thecityplus.in
export const INSTAGRAM_URL = 'https://instagram.com/thecityplus.in';

// ── Razorpay ──────────────────────────────────────────────────────────────────
// Read from process.env first (available when running via `expo start` with a
// local .env file), then fall back to Constants.expoConfig.extra which is
// reliably embedded into the APK/IPA bundle at EAS build time via app.config.js.
// This dual-read ensures the key is available in BOTH local dev and built APKs.
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  Constants.expoConfig?.extra?.razorpayKeyId ||
  '';

export const CATS = [
  'All',
  'Delivery',
  'Driver',
  'Security',
  'Construction',
  'Domestic Help',
  'TeleCaller',
  'Shop Assistant',
  'Data Entry',
  'Teaching',
  'Other',
];

export const CAT_ICONS = {
  Delivery:       'bicycle-outline',
  Driver:         'car-outline',
  Security:       'shield-checkmark-outline',
  Construction:   'construct-outline',
  'Domestic Help':'home-outline',
  TeleCaller:     'call-outline',
  'Shop Assistant':'storefront-outline',
  'Data Entry':   'desktop-outline',
  Teaching:       'school-outline',
  Other:          'briefcase-outline',
};

export const PRICING = {
  free: 0,
  featured: 99,
  urgent: 49,
};

export const JOB_PLANS = [
  { id: 'free',     label: 'Free',     price: 0,   description: 'Standard listing for 30 days' },
  { id: 'featured', label: 'Featured', price: 99,  description: 'Top placement + orange badge' },
  { id: 'urgent',   label: 'Urgent',   price: 49,  description: 'Urgent tag + priority listing' },
];

export const CAR_PLANS = [
  { id: 'free',     label: 'Free',     price: 0,   description: 'List your vehicle for 30 days' },
  { id: 'featured', label: 'Featured', price: 79,  description: 'Top placement in car listings' },
];

export const ROOM_PLANS = [
  { id: 'free',     label: 'Free',     price: 0,   description: 'List your room for 30 days' },
  { id: 'featured', label: 'Featured', price: 79,  description: 'Top placement in room listings' },
];

export const BUYSELL_PLANS = [
  { id: 'free',     label: 'Free',     price: 0,   description: 'List your item for 15 days' },
  { id: 'featured', label: 'Featured', price: 49,  description: 'Top placement in buy & sell' },
];
