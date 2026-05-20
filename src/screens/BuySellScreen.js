import React, { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
  Animated, Easing, Platform, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';

const ORANGE  = '#f97316';
const IS_WEB  = Platform.OS === 'web';

const CATEGORIES = [
  { key: 'All',         label: 'All',         icon: 'grid-outline' },
  { key: 'Electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  { key: 'Furniture',   label: 'Furniture',   icon: 'bed-outline' },
  { key: 'Vehicles',    label: 'Vehicles',    icon: 'bicycle-outline' },
  { key: 'Clothes',     label: 'Clothes',     icon: 'shirt-outline' },
  { key: 'Books',       label: 'Books',       icon: 'book-outline' },
  { key: 'Other',       label: 'Other',       icon: 'cube-outline' },
];

const PRICE_RANGES = [
  { label: 'Any',          min: 0,     max: Infinity },
  { label: 'Under ₹500',  min: 0,     max: 500 },
  { label: '₹500–₹2k',   min: 500,   max: 2000 },
  { label: '₹2k–₹10k',   min: 2000,  max: 10000 },
  { label: 'Above ₹10k',  min: 10000, max: Infinity },
];

const CONDITIONS = ['Any', 'New', 'Like new', 'Good', 'Used'];

const SORT_OPTIONS = [
  { label: 'Most Recent',   value: 'recent' },
  { label: 'Lowest Price',  value: 'priceAsc' },
  { label: 'Highest Price', value: 'priceDesc' },
];

const CARD_COLORS = ['#1a2a3a', '#4a1942', '#1a3a2a', '#2a2030', '#1e3a5f', '#3a2a1a'];

const CONDITION_COLORS = {
  'New':      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Like new': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Good':     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'Used':     { bg: '#f5f5f5', text: '#555',    border: '#e0e0e0' },
};

export const SAMPLE_ITEMS = [
  {
    id: '1', title: 'Samsung TV 42"', price: '₹8,500', priceNum: 8500,
    cat: 'Electronics', loc: 'Cidco', time: '2h ago', condition: 'Good',
    seller: { name: 'Ravi Kumar', verified: true }, phone: '9876543210',
    description: 'Samsung 42" Full HD LED TV. Works perfectly. Remote included. Selling due to upgrade.',
    photos: 0,
  },
  {
    id: '2', title: 'Wooden Study Table', price: '₹2,200', priceNum: 2200,
    cat: 'Furniture', loc: 'Vazirabad', time: '5h ago', condition: 'Like new',
    seller: { name: 'Priya Deshpande', verified: true }, phone: '9765432109',
    description: 'Solid wood study table with drawer. Only 6 months old. No scratches.',
    photos: 2,
  },
  {
    id: '3', title: 'Honda Activa 2019', price: '₹45,000', priceNum: 45000,
    cat: 'Vehicles', loc: 'Station Road', time: '1d ago', condition: 'Good',
    seller: { name: 'Suresh Patil', verified: false }, phone: '9812345678',
    description: '2019 Honda Activa 5G. 28,000 km driven. All documents clear. Insurance valid.',
    photos: 3,
  },
  {
    id: '4', title: 'Engineering Books Set', price: '₹600', priceNum: 600,
    cat: 'Books', loc: 'SRTMU Area', time: '3h ago', condition: 'Used',
    seller: { name: 'Amit Jadhav', verified: false }, phone: '9898989898',
    description: '3rd year engineering books — DBMS, OS, CN. Slightly highlighted. Very useful.',
    photos: 1,
  },
  {
    id: '5', title: 'Refrigerator 200L', price: '₹6,000', priceNum: 6000,
    cat: 'Electronics', loc: 'Shivaji Nagar', time: '6h ago', condition: 'Good',
    seller: { name: 'Meena Kulkarni', verified: true }, phone: '9911223344',
    description: 'Godrej 200L single door fridge. Runs perfectly. Selling due to relocation.',
    photos: 0,
  },
  {
    id: '6', title: 'Single Bed with Mattress', price: '₹3,500', priceNum: 3500,
    cat: 'Furniture', loc: 'Cidco', time: '2d ago', condition: 'Used',
    seller: { name: 'Deepak More', verified: false }, phone: '9876001234',
    description: 'Wooden single bed with 5 inch foam mattress. Sturdy and comfortable.',
    photos: 1,
  },
];

/* ─── Animated fade-in wrapper ─── */
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

/* ─── Pulsing live dot ─── */
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: '#16a34a', transform: [{ scale }],
    }} />
  );
}

/* ─── Top Deals Banner ─── */
function TopDealsBanner() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={s.trendingBanner}>
      <View style={s.trendingAccent} />
      <Animated.View style={[s.trendingIconWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="pricetag" size={20} color={ORANGE} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={s.trendingTitle}>Top Deals This Week</Text>
        <Text style={s.trendingSub}>Electronics, Furniture & more in Nanded</Text>
      </View>
      <View style={s.liveBadge}>
        <PulseDot />
        <Text style={s.liveTxt}>LIVE</Text>
      </View>
    </View>
  );
}

/* ─── Side card wrapper ─── */
function SideCard({ children, style }) {
  return <View style={[ws.sideCard, style]}>{children}</View>;
}

/* ─── Quick action row ─── */
function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={ws.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[ws.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={ws.quickLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={13} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

/* ─── Item Card ─── */
function ItemCard({ item, index, onPress }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, delay: index * 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 360, delay: index * 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  const cardBg      = CARD_COLORS[index % CARD_COLORS.length];
  const condColors  = CONDITION_COLORS[item.condition] || CONDITION_COLORS['Used'];
  const catMeta     = CATEGORIES.find(c => c.key === item.cat);
  const iconName    = catMeta?.icon || 'pricetag-outline';
  const isNew       = item.condition === 'New' || item.condition === 'Like new';
  const photoCount  = item.photos || 0;

  const webTagPills = [item.cat, item.condition].filter(Boolean).slice(0, 2);

  if (IS_WEB) {
    return (
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
        <TouchableOpacity activeOpacity={0.97} onPress={handlePress} style={ws.card}>

          {/* Top photo area */}
          <View style={[ws.cardPhoto, { backgroundColor: cardBg }]}>
            <Ionicons name={iconName} size={64} color="rgba(255,255,255,0.14)" />
            <View style={ws.photoOverlay} />

            {/* Category pills at bottom */}
            {webTagPills.length > 0 && (
              <View style={ws.photoPillsRow}>
                {webTagPills.map((label, i) => (
                  <View key={i} style={[ws.photoPill, i === 0 && ws.photoPillActive]}>
                    <Text style={[ws.photoPillTxt, i === 0 && ws.photoPillTxtActive]}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Photos badge — top left */}
            <View style={ws.photosBadge}>
              <Text style={ws.photosBadgeTxt}>
                {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'photos'}
              </Text>
            </View>

            {/* Price badge — top right */}
            <View style={[ws.availBadge, { backgroundColor: '#111' }]}>
              <Text style={ws.availTxt}>{item.price}</Text>
            </View>

            {/* NEW badge */}
            {isNew && <View style={ws.newBadge}><Text style={ws.newBadgeTxt}>NEW</Text></View>}
          </View>

          {/* Card body */}
          <View style={ws.cardBody}>
            <View style={ws.cardTitleRow}>
              <Text style={ws.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={ws.priceWrap}><Text style={ws.priceAmt}>{item.price}</Text></View>
            </View>

            <View style={ws.locationRow}>
              <Ionicons name="location-outline" size={12} color="#aaa" />
              <Text style={ws.locationTxt}>{item.loc} · {item.time}</Text>
            </View>

            <View style={ws.tagsRow}>
              {item.cat && (
                <View style={ws.tag}>
                  <Ionicons name={iconName} size={10} color="#555" style={{ marginRight: 3 }} />
                  <Text style={ws.tagTxt}>{item.cat}</Text>
                </View>
              )}
              {item.condition && (
                <View style={[ws.tag, { borderColor: condColors.border, backgroundColor: condColors.bg }]}>
                  <Text style={[ws.tagTxt, { color: condColors.text }]}>{item.condition}</Text>
                </View>
              )}
              {item.seller?.verified && (
                <View style={[ws.tag, ws.tagBlue]}>
                  <Ionicons name="shield-checkmark" size={10} color="#0891b2" style={{ marginRight: 3 }} />
                  <Text style={[ws.tagTxt, { color: '#0891b2' }]}>Verified</Text>
                </View>
              )}
            </View>

            <View style={ws.cardFooter}>
              <View style={ws.ownerRow}>
                <View style={ws.ownerAvatar}>
                  <Text style={ws.ownerInitial}>{(item.seller?.name || 'S')[0].toUpperCase()}</Text>
                </View>
                <Text style={ws.ownerName} numberOfLines={1}>{item.seller?.name || 'Seller'}</Text>
              </View>
              <TouchableOpacity style={ws.viewBtn} onPress={handlePress}>
                <Text style={ws.viewBtnTxt}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* Mobile card */
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={s.card}>

        {/* Photo area */}
        <View style={[s.cardPhoto, { backgroundColor: cardBg }]}>
          <Ionicons name={iconName} size={58} color="rgba(255,255,255,0.14)" />
          <View style={s.photoOverlay} />
          <View style={s.photosBadge}>
            <Text style={s.photosBadgeTxt}>
              {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'photos'}
            </Text>
          </View>
          <View style={[s.availBadge, { backgroundColor: '#111' }]}>
            <Text style={s.availTxt}>{item.price}</Text>
          </View>
          {isNew && <View style={s.newBadge}><Text style={s.newBadgeTxt}>NEW</Text></View>}
        </View>

        {/* Info section */}
        <View style={s.cardInfo}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>

          <View style={s.cardMetaRow}>
            <View style={[s.condBadge, { backgroundColor: condColors.bg, borderColor: condColors.border }]}>
              <Text style={[s.condTxt, { color: condColors.text }]}>{item.condition}</Text>
            </View>
            <View style={s.cardMetaChip}>
              <Ionicons name="location-outline" size={11} color="#888" />
              <Text style={s.cardMetaTxt}>{item.loc}</Text>
            </View>
            <View style={s.cardMetaChip}>
              <Ionicons name="time-outline" size={11} color="#888" />
              <Text style={s.cardMetaTxt}>{item.time}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════ */
export default function BuySellScreen({ route }) {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  const [activeCat,   setActiveCat]   = useState('All');
  const [search,      setSearch]      = useState(route?.params?.searchQuery || '');
  const [condition,   setCondition]   = useState('Any');
  const [priceRange,  setPriceRange]  = useState(PRICE_RANGES[0]);
  const [sortBy,      setSortBy]      = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort,    setShowSort]    = useState(false);
  const [items,       setItems]       = useState(SAMPLE_ITEMS);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const showSidebar = IS_WEB && winW >= 900;

  // ── Scroll animation for sticky mini-header ──────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const STICKY_THRESHOLD = 160;
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const stickyTranslate = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [-56, 0],
    extrapolate: 'clamp',
  });

  useLayoutEffect(() => {
    if (IS_WEB) nav.setOptions({ headerShown: false });
  }, [nav]);

  const sheetY = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    if (showFilters) {
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
    } else {
      Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: true }).start();
    }
  }, [showFilters]);

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await http('GET', '/api/buysell');
      if (res.ok && res.items?.length > 0) {
        const mapped = res.items.map(v => ({
          id:          String(v.id),
          title:       v.title || v.name || 'Item',
          price:       v.price ? `₹${Number(v.price).toLocaleString('en-IN')}` : 'Price on request',
          priceNum:    v.price || 0,
          cat:         v.category || 'Other',
          loc:         v.area || v.location || 'Nanded',
          time:        v.created_at
            ? (() => {
                const diff = Math.floor((Date.now() - new Date(v.created_at)) / 60000);
                if (diff < 60)   return `${diff}m ago`;
                if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
                return `${Math.floor(diff / 1440)}d ago`;
              })()
            : '',
          condition:   v.condition || 'Used',
          description: v.description || '',
          seller:      { name: v.seller_name || v.poster_name || 'Seller', verified: !!v.verified },
          phone:       v.phone || v.whatsapp || '',
          photos:      Array.isArray(v.photos) ? v.photos.length : 0,
          postedAt:    v.created_at ? new Date(v.created_at).getTime() : 0,
        }));
        setItems(mapped);
      }
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    let list = items.filter(item => {
      const matchCat       = activeCat === 'All' || item.cat === activeCat;
      const matchSearch    = !search ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.loc?.toLowerCase().includes(search.toLowerCase()) ||
        item.cat?.toLowerCase().includes(search.toLowerCase());
      const matchCondition = condition === 'Any' || item.condition === condition;
      const matchPrice     = item.priceNum >= priceRange.min && item.priceNum <= priceRange.max;
      return matchCat && matchSearch && matchCondition && matchPrice;
    });
    if (sortBy === 'priceAsc')  list = [...list].sort((a, b) => a.priceNum - b.priceNum);
    if (sortBy === 'priceDesc') list = [...list].sort((a, b) => b.priceNum - a.priceNum);
    if (sortBy === 'recent')    list = [...list].sort((a, b) => b.postedAt - a.postedAt);
    return list;
  }, [items, activeCat, search, condition, priceRange, sortBy]);

  const activeFilters = [
    activeCat !== 'All'        ? activeCat        : null,
    condition !== 'Any'        ? condition         : null,
    priceRange.label !== 'Any' ? priceRange.label  : null,
  ].filter(Boolean);

  /* ── Shared header ── */
  const Header = (
    <FadeIn>
      <View style={IS_WEB ? ws.header : s.header}>
        <View style={s.titleRow}>
          <View>
            <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>
              Buy & Sell in <Text style={{ color: ORANGE }}>Nanded</Text>
            </Text>
            <Text style={IS_WEB ? ws.pageCount : s.pageCount}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} listed
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* On mobile only — Sort and Filter buttons; on web, Sort is in the right sidebar */}
            {!IS_WEB && (
              <TouchableOpacity
                style={[s.iconBtn, showSort && s.iconBtnActive]}
                onPress={() => setShowSort(true)}
              >
                <Ionicons name="swap-vertical-outline" size={16} color={showSort ? '#fff' : '#555'} />
                {activeFilters.length > 0 && (
                  <View style={s.filterBadge}>
                    <Text style={s.filterBadgeTxt}>{activeFilters.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {!IS_WEB && (
              <TouchableOpacity
                style={[s.iconBtn, activeFilters.length > 0 && s.iconBtnActive]}
                onPress={() => setShowFilters(true)}
              >
                <Ionicons name="options-outline" size={16} color={activeFilters.length > 0 ? '#fff' : '#555'} />
                {activeFilters.length > 0 && (
                  <View style={s.filterBadge}>
                    <Text style={s.filterBadgeTxt}>{activeFilters.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[s.searchWrap, IS_WEB && ws.searchWrap]}>
          <Ionicons name="search-outline" size={16} color="#bbb" style={{ marginLeft: 12 }} />
          <TextInput
            style={[s.searchInput, IS_WEB && ws.searchInput]}
            placeholder="Search items, area, category…"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={17} color="#bbb" />
            </TouchableOpacity>
          )}
          {IS_WEB && (
            <TouchableOpacity style={ws.searchFilterBtn} onPress={() => setShowFilters(true)}>
              <Ionicons name="options-outline" size={15} color={ORANGE} />
              <Text style={ws.filterBtnTxt}>Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.pillsRow, IS_WEB && ws.pillsRow]}
          style={{ maxHeight: 52 }}
        >
          {CATEGORIES.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveCat(key)}
              style={[s.pill, IS_WEB && ws.pill, activeCat === key && s.pillActive]}
            >
              <Ionicons
                name={icon}
                size={12}
                color={activeCat === key ? '#fff' : '#666'}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.pillTxt, activeCat === key && s.pillTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {IS_WEB && activeFilters.length > 0 && (
          <View style={ws.activeFiltersRow}>
            <Text style={ws.activeFiltersLabel}>Filters:</Text>
            {activeFilters.map((f, i) => (
              <TouchableOpacity key={i} style={ws.activeChip}
                onPress={() => {
                  if (f === activeCat)       setActiveCat('All');
                  else if (f === condition)  setCondition('Any');
                  else                       setPriceRange(PRICE_RANGES[0]);
                }}>
                <Text style={ws.activeChipTxt}>{f}</Text>
                <Ionicons name="close" size={11} color={ORANGE} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </FadeIn>
  );

  const ListHeader = null;

  // ── Sticky mini-header (floats above scroll) ────────────────────────────
  const StickyHeader = (
    <Animated.View
      pointerEvents="box-none"
      style={[
        IS_WEB ? ws.stickyBar : s.stickyBar,
        !IS_WEB && { top: insets.top },
        { opacity: stickyOpacity, transform: [{ translateY: stickyTranslate }] },
      ]}
    >
      <View style={IS_WEB ? ws.stickyInner : s.stickyInner}>
        <Text style={IS_WEB ? ws.stickyTitle : s.stickyTitle}>
          Buy &amp; Sell in <Text style={{ color: ORANGE }}>Nanded</Text>
        </Text>
        <View style={IS_WEB ? ws.stickySearch : s.stickySearch}>
          <Ionicons name="search-outline" size={15} color="#bbb" style={{ marginLeft: 10 }} />
          <TextInput
            style={IS_WEB ? ws.stickyInput : s.stickyInput}
            placeholder="Search items…"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingHorizontal: 6 }}>
              <Ionicons name="close-circle" size={15} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const Empty = (
    <View style={s.emptyWrap}>
      <Ionicons name="pricetag-outline" size={52} color="#d1d5db" />
      <Text style={s.emptyTxt}>No items found</Text>
      <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>
        {search || activeCat !== 'All' ? 'Try adjusting your filters' : 'Be the first to list an item!'}
      </Text>
      {(search || activeCat !== 'All') && (
        <TouchableOpacity onPress={() => { setSearch(''); setActiveCat('All'); setCondition('Any'); setPriceRange(PRICE_RANGES[0]); }}>
          <Text style={s.emptyClear}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SortModal = (
    <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSort(false)} />
      <View style={[s.sheet, IS_WEB && ws.centeredModal]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Sort By</Text>
          <TouchableOpacity onPress={() => setShowSort(false)}>
            <Ionicons name="close" size={22} color="#888" />
          </TouchableOpacity>
        </View>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity key={opt.value} style={[s.rangeRow, sortBy === opt.value && s.rangeActive]}
            onPress={() => { setSortBy(opt.value); setShowSort(false); }}>
            <Text style={[s.rangeTxt, sortBy === opt.value && { color: ORANGE, fontWeight: '700' }]}>{opt.label}</Text>
            {sortBy === opt.value && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );

  const FilterModal = (
    <Modal visible={showFilters} transparent animationType="none" onRequestClose={() => setShowFilters(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
      <Animated.View style={[s.sheet, IS_WEB && ws.centeredModal, { transform: [{ translateY: IS_WEB ? 0 : sheetY }] }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filters</Text>
          <TouchableOpacity onPress={() => { setActiveCat('All'); setCondition('Any'); setPriceRange(PRICE_RANGES[0]); }}>
            <Text style={s.resetTxt}>Reset All</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.filterLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {CATEGORIES.map(({ key, label }) => (
            <TouchableOpacity key={key} onPress={() => setActiveCat(key)}
              style={[s.pill, activeCat === key && s.pillActive, { marginBottom: 0 }]}>
              <Text style={[s.pillTxt, activeCat === key && s.pillTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[s.filterLabel, { marginTop: 16 }]}>Condition</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {CONDITIONS.map(c => (
            <TouchableOpacity key={c} onPress={() => setCondition(c)}
              style={[s.pill, condition === c && s.pillActive, { marginBottom: 0 }]}>
              <Text style={[s.pillTxt, condition === c && s.pillTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[s.filterLabel, { marginTop: 16 }]}>Price Range</Text>
        {PRICE_RANGES.map(pr => (
          <TouchableOpacity key={pr.label} style={[s.rangeRow, priceRange.label === pr.label && s.rangeActive]}
            onPress={() => setPriceRange(pr)}>
            <Text style={[s.rangeTxt, priceRange.label === pr.label && { color: ORANGE, fontWeight: '700' }]}>{pr.label}</Text>
            {priceRange.label === pr.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilters(false)}>
          <Text style={s.applyFilterTxt}>Apply Filters</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );

  /* ══════════ WEB LAYOUT ══════════ */
  if (IS_WEB) {
    return (
      <View style={ws.root}>

        {/* Sticky top bar */}
        <View style={ws.topBar}>
          <TouchableOpacity style={ws.topBarBack} onPress={() => nav.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={16} color="#333" />
          </TouchableOpacity>
          <Text style={ws.topBarTitle}>Buy &amp; Sell</Text>
        </View>

        {StickyHeader}

        <View style={ws.body}>

          {/* LEFT SIDEBAR */}
          {showSidebar && (
            <View style={ws.leftSidebar}>

              {/* Sell CTA */}
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>HAVE SOMETHING?</Text>
                <Text style={ws.ctaTitle}>Sell It Free</Text>
                <Text style={ws.ctaSub}>Reach thousands of buyers in Nanded instantly. Zero listing fees!</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('Post')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>Post an Item</Text>
                </TouchableOpacity>
              </SideCard>

              {/* Browse Categories */}
              <SideCard>
                <Text style={ws.sideTitle}>Categories</Text>
                {CATEGORIES.map(({ key, label, icon }) => (
                  <TouchableOpacity key={key} style={ws.catRow} onPress={() => setActiveCat(key)} activeOpacity={0.75}>
                    <View style={ws.catIconWrap}>
                      <Ionicons name={icon} size={14} color={ORANGE} />
                    </View>
                    <Text style={[ws.catLabel, activeCat === key && { color: ORANGE, fontWeight: '700' }]}>{label}</Text>
                    {activeCat === key && <Ionicons name="checkmark-circle" size={14} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Explore More */}
              <SideCard>
                <Text style={ws.sideTitle}>Explore More</Text>
                <QuickAction icon="briefcase-outline" label="Find a Job"     color={ORANGE}   onPress={() => nav.navigate('Jobs')} />
                <QuickAction icon="home-outline"      label="Find a Room"    color="#0d9488"  onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="car-sport-outline" label="Rent a Vehicle" color="#9333ea"  onPress={() => nav.navigate('Cars')} />
              </SideCard>
            </View>
          )}

          {/* MAIN COLUMN */}
          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              contentContainerStyle={ws.list}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} tintColor={ORANGE} colors={[ORANGE]} />
              }
              ListHeaderComponent={<>{Header}{ListHeader}</>}
              ListEmptyComponent={Empty}
              renderItem={({ item, index }) => (
                <ItemCard item={item} index={index} onPress={() => nav.navigate('BuySellDetail', { item })} />
              )}
            />
          </View>

          {/* RIGHT SIDEBAR */}
          {showSidebar && (
            <View style={ws.rightSidebar}>

              <SideCard>
                <Text style={ws.sideTitle}>Sort By</Text>
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.value} style={[ws.sortRow, sortBy === opt.value && ws.sortRowActive]}
                    onPress={() => setSortBy(opt.value)}>
                    <Text style={[ws.sortTxt, sortBy === opt.value && ws.sortTxtActive]}>{opt.label}</Text>
                    {sortBy === opt.value && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Price Range</Text>
                {PRICE_RANGES.map(pr => (
                  <TouchableOpacity key={pr.label} style={[ws.sortRow, priceRange.label === pr.label && ws.sortRowActive]}
                    onPress={() => setPriceRange(pr)}>
                    <Text style={[ws.sortTxt, priceRange.label === pr.label && ws.sortTxtActive]}>{pr.label}</Text>
                    {priceRange.label === pr.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Condition</Text>
                {CONDITIONS.map(c => (
                  <TouchableOpacity key={c} style={[ws.sortRow, condition === c && ws.sortRowActive]}
                    onPress={() => setCondition(c)}>
                    <Text style={[ws.sortTxt, condition === c && ws.sortTxtActive]}>{c}</Text>
                    {condition === c && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>🛒 Buying Tips</Text>
                {[
                  'Meet seller in a public place',
                  'Inspect item before paying',
                  'Agree on price before meeting',
                ].map((tip, i) => (
                  <View key={i} style={ws.tipRow}>
                    <View style={ws.tipDot} />
                    <Text style={ws.tipTxt}>{tip}</Text>
                  </View>
                ))}
              </SideCard>
            </View>
          )}
        </View>

        {SortModal}{FilterModal}
      </View>
    );
  }

  /* ══════════ MOBILE LAYOUT ══════════ */
  return (
    <View style={s.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={<>{Header}{ListHeader}</>}
        contentContainerStyle={s.list}
        ListEmptyComponent={Empty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} tintColor={ORANGE} colors={[ORANGE]} />
        }
        renderItem={({ item, index }) => (
          <ItemCard item={item} index={index} onPress={() => nav.navigate('BuySellDetail', { item })} />
        )}
      />

      {/* Sell FAB */}
      <TouchableOpacity style={s.sellBtn} activeOpacity={0.9} onPress={() => nav.navigate('Post')}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.sellBtnTxt}>Sell an Item</Text>
      </TouchableOpacity>

      {SortModal}{FilterModal}
    </View>
  );
}

/* ─────────────────────────── MOBILE STYLES ─────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingHorizontal: 12, paddingBottom: 100 },

  header: {
    backgroundColor: '#fff', borderRadius: 16,
    margin: 12, marginBottom: 0, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 2 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 14 },

  iconBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e8e8e8',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
  },
  iconBtnActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12, height: 48,
    borderWidth: 1.5, borderColor: '#ebebeb', marginBottom: 14, overflow: 'hidden',
  },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: '#111' },

  pillsRow: { gap: 8, paddingBottom: 4, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 100,
  },
  pillActive:    { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:       { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff' },

  trendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff7f0', borderRadius: 14, padding: 14,
    marginBottom: 10, marginTop: 10,
    borderWidth: 1.5, borderColor: '#fed7aa',
    position: 'relative', overflow: 'hidden',
  },
  trendingAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: ORANGE, borderRadius: 2 },
  trendingIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fed7aa',
  },
  trendingTitle: { fontSize: 14, fontWeight: '800', color: ORANGE },
  trendingSub:   { fontSize: 12, color: '#c2410c', marginTop: 1, fontWeight: '500' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  liveTxt: { fontSize: 11, fontWeight: '800', color: '#16a34a' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8e8e8',
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardPhoto: {
    height: 180, alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  photosBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 11,
  },
  photosBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  availBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 11,
  },
  availTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  newBadge: {
    position: 'absolute', top: 44, right: 10,
    backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 11,
  },
  newBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  cardInfo: { padding: 14, paddingTop: 13 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 3, letterSpacing: -0.2 },
  cardDesc:  { fontSize: 12.5, color: '#888', lineHeight: 18, marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  condBadge: {
    borderWidth: 1, borderRadius: 6,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  condTxt: { fontSize: 10, fontWeight: '700' },
  cardMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 11, backgroundColor: '#fafafa',
  },
  cardMetaTxt: { fontSize: 12, color: '#444', fontWeight: '500' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTxt:   { color: '#9ca3af', fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyClear: { color: ORANGE, fontWeight: '700', marginTop: 8, fontSize: 13 },

  sellBtn: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  sellBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', color: '#111' },
  resetTxt:    { fontSize: 13, fontWeight: '700', color: ORANGE },
  filterLabel: { fontSize: 12, fontWeight: '800', color: '#aaa', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  rangeRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  rangeActive: { backgroundColor: '#fff7f0' },
  rangeTxt:    { fontSize: 14, color: '#444', fontWeight: '600' },
  applyFilterBtn: { marginTop: 16, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyFilterTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  stickyBar: {
    position: 'absolute',
    left: 0, right: 0,
    zIndex: 999,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  stickyInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  stickyTitle: { fontSize: 14, fontWeight: '900', color: '#111', letterSpacing: -0.2, flexShrink: 0 },
  stickySearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 10, height: 34,
    borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  stickyInput: { flex: 1, height: 34, paddingHorizontal: 8, fontSize: 13, color: '#111' },
});

/* ─────────────────────────── WEB STYLES ─────────────────────────── */
const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  body: {
    flex: 1, flexDirection: 'row',
    maxWidth: 1400, width: '100%', alignSelf: 'center',
    paddingTop: 12, paddingHorizontal: 16, gap: 16,
  },

  leftSidebar: {
    width: 220, flexShrink: 0, gap: 12,
    alignSelf: 'flex-start', position: 'sticky', top: 70,
    maxHeight: 'calc(100vh - 82px)', overflowY: 'auto', paddingBottom: 16,
  },
  mainCol: { flex: 1, minWidth: 0, flexShrink: 1 },
  rightSidebar: {
    width: 220, flexShrink: 0, gap: 12,
    alignSelf: 'flex-start', position: 'sticky', top: 70,
    maxHeight: 'calc(100vh - 82px)', overflowY: 'auto', paddingBottom: 16,
  },

  list: { paddingTop: 0, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingVertical: 12, paddingHorizontal: 20, gap: 12,
    position: 'sticky', top: 0, zIndex: 100,
  },
  topBarBack: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f9f9f9',
  },
  topBarPlainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  topBarBackTxt: { fontSize: 13, fontWeight: '700', color: '#111' },
  topBarTitle:   { fontSize: 15, fontWeight: '800', color: '#111' },

  header: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 2 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 16 },

  iconBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e8e8e8',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12, height: 48,
    borderWidth: 1.5, borderColor: '#ebebeb', marginBottom: 14, overflow: 'hidden',
  },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: '#111', outlineStyle: 'none' },
  searchFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 48, paddingHorizontal: 16,
    backgroundColor: '#fff7f0', borderLeftWidth: 1, borderLeftColor: '#ebebeb',
  },
  filterBtnTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },

  pillsRow: { gap: 8, paddingBottom: 14, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 100,
  },

  activeFiltersRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  activeFiltersLabel: { fontSize: 11, color: '#bbb', fontWeight: '600' },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 100, borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  activeChipTxt: { fontSize: 11, color: ORANGE, fontWeight: '700' },

  sideCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden', position: 'relative',
  },
  sideTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  ctaCard:    { backgroundColor: ORANGE },
  ctaCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: -30, right: -20 },
  ctaCircle2: { position: 'absolute', width: 70,  height: 70,  borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -15, right: 30 },
  ctaEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4, position: 'relative' },
  ctaTitle:   { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 5, position: 'relative' },
  ctaSub:     { fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 16, marginBottom: 14, position: 'relative' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, alignSelf: 'flex-start', position: 'relative',
  },
  ctaBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2,
  },
  catIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff7f0', alignItems: 'center', justifyContent: 'center' },
  catLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },

  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2,
  },
  sortRowActive: { backgroundColor: '#fff7f0' },
  sortTxt:       { fontSize: 13, fontWeight: '600', color: '#444' },
  sortTxtActive: { color: ORANGE, fontWeight: '700' },

  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 6, borderRadius: 10, marginBottom: 2,
  },
  quickIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#222' },

  tipCard:  { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#15803d', marginBottom: 10 },
  tipRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 6, flexShrink: 0 },
  tipTxt:   { fontSize: 12, color: '#166534', lineHeight: 18, flex: 1 },

  centeredModal: {
    position: 'absolute', top: '50%', left: '50%',
    transform: [{ translateX: -180 }, { translateY: -200 }],
    width: 360, borderRadius: 20, bottom: 'auto',
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#ebebeb', marginBottom: 14,
    overflow: 'hidden', flexDirection: 'column',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardPhoto: {
    height: 200, alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  photoPillsRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingBottom: 14, paddingHorizontal: 16,
  },
  photoPill:          { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 18 },
  photoPillActive:    { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  photoPillTxt:       { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  photoPillTxtActive: { color: '#fff', fontWeight: '700' },

  photosBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 11,
  },
  photosBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  availBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 11,
  },
  availTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  newBadge: {
    position: 'absolute', top: 44, right: 10,
    backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 11,
  },
  newBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  cardBody:     { flex: 1, padding: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 8 },
  cardTitle:    { fontSize: 16, fontWeight: '800', color: '#111', flex: 1, lineHeight: 22 },
  priceWrap:    { alignItems: 'flex-end', flexShrink: 0 },
  priceAmt:     { fontSize: 14, fontWeight: '700', color: ORANGE },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  locationTxt: { fontSize: 12, color: '#888', fontWeight: '500' },

  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0',
    paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fafafa',
  },
  tagBlue: { borderColor: '#a5f3fc', backgroundColor: '#ecfeff' },
  tagTxt:  { fontSize: 11, color: '#555', fontWeight: '500' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ownerRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  ownerAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff7f0', borderWidth: 1, borderColor: '#fed7aa',
    alignItems: 'center', justifyContent: 'center',
  },
  ownerInitial: { fontSize: 11, fontWeight: '700', color: ORANGE },
  ownerName:    { fontSize: 11, color: '#888', fontWeight: '600', flex: 1 },

  viewBtn:    { borderWidth: 1.5, borderColor: ORANGE, borderRadius: 22, paddingVertical: 7, paddingHorizontal: 22 },
  viewBtnTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },

  stickyBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  stickyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  stickySearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  stickyInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#111',
    outlineStyle: 'none',
  },
});
