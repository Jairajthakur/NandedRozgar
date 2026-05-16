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

export const BASE_URL = 'https://nandedrozgar-api.onrender.com';

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
  basic: 0,
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
  { id: 'free',     label: 'Free',     price: 0,   description: 'List your item for 30 days' },
  { id: 'featured', label: 'Featured', price: 49,  description: 'Top placement in buy & sell' },
];
