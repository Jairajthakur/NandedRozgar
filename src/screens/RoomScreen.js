import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
  Animated, Easing, Platform, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const TEAL   = '#0d9488';
const IS_WEB = Platform.OS === 'web';

const ROOM_TYPES = ['All', '1BHK', '2BHK', 'PG', 'Single Room', 'Male', 'Female'];

const RENT_RANGES = [
  { label: 'Any',         min: 0,     max: Infinity },
  { label: 'Under ₹3k',  min: 0,     max: 3000 },
  { label: '₹3k–₹6k',   min: 3000,  max: 6000 },
  { label: '₹6k–₹10k',  min: 6000,  max: 10000 },
  { label: 'Above ₹10k', min: 10000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: 'Most Recent',  value: 'recent' },
  { label: 'Lowest Rent',  value: 'rentAsc' },
  { label: 'Highest Rent', value: 'rentDesc' },
];

const CARD_COLORS = ['#1a2a3a', '#4a1942', '#1a3a2a', '#2a2030', '#1e3a5f', '#3a2a1a'];

export const ROOMS = [
  {
    id: 'r1', title: '1BHK Flat — Vazirabad', location: 'Vazirabad', type: '1BHK',
    rent: '₹5,500/mo', rentNum: 5500, available: true,
    description: 'Furnished · 2nd floor · Near Bus Stand. Well maintained with 24/7 water & security.',
    amenities: ['WiFi', 'Power Backup', 'Parking'],
    for: 'Any', listedDaysAgo: 2, deposit: '2 months',
    owner: { name: 'Ramesh Kulkarni', verified: true }, phone: '9876543210',
  },
  {
    id: 'r2', title: 'PG — Girls Hostel', location: 'Near SRTMU', type: 'PG',
    rent: '₹4,200/mo', rentNum: 4200, available: true,
    description: 'AC rooms with 3 meals included. Safe & secure. Curfew 10 PM.',
    amenities: ['AC', 'Meals', 'WiFi'],
    for: 'Female', listedDaysAgo: 5, deposit: '1 month',
    owner: { name: 'Sunita Deshpande', verified: true }, phone: '9765432109',
  },
  {
    id: 'r3', title: 'Single Room — Station Road', location: 'Station Road', type: 'Single Room',
    rent: '₹3,000/mo', rentNum: 3000, available: true,
    description: 'Furnished single room near railway station. Ideal for students & bachelors.',
    amenities: ['WiFi'],
    for: 'Male', listedDaysAgo: 8, deposit: '1 month',
    owner: { name: 'Prakash More', verified: false }, phone: '9812345678',
  },
  {
    id: 'r4', title: '2BHK — Vazirabad Main Road', location: 'Vazirabad', type: '2BHK',
    rent: '₹8,000/mo', rentNum: 8000, available: false,
    description: 'Well-maintained 2BHK flat with parking. Suitable for families.',
    amenities: ['Parking', 'Power Backup'],
    for: 'Any', listedDaysAgo: 20, deposit: '2 months',
    owner: { name: 'Anil Patil', verified: false }, phone: '9898989898',
  },
  {
    id: 'r5', title: 'PG — Boys Hostel CIDCO', location: 'CIDCO', type: 'PG',
    rent: '₹3,800/mo', rentNum: 3800, available: true,
    description: 'Spacious PG with attached bath, 2 meals included. Very near CIDCO bus stop.',
    amenities: ['Meals', 'Laundry'],
    for: 'Male', listedDaysAgo: 3, deposit: '1 month',
    owner: { name: 'Deepak Jadhav', verified: true }, phone: '9911223344',
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

/* ─── Trending Rooms Banner ─── */
function TrendingBanner() {
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
        <Ionicons name="home" size={20} color={ORANGE} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={s.trendingTitle}>Top Listings This Week</Text>
        <Text style={s.trendingSub}>PG, 1BHK & Single rooms in demand</Text>
      </View>
      <View style={s.liveBadge}>
        <PulseDot />
        <Text style={s.liveTxt}>LIVE</Text>
      </View>
    </View>
  );
}

/* ─── Side card wrapper (matches Jobs page) ─── */
function SideCard({ children, style }) {
  return <View style={[ws.sideCard, style]}>{children}</View>;
}

/* ─── Quick action row (matches Jobs page) ─── */
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

/* ─── Room Card ─── */
function RoomCard({ item, index, onPress }) {
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

  const accentColor = item.available ? ORANGE : '#9ca3af';
  const cardBg = CARD_COLORS[index % CARD_COLORS.length];

  if (IS_WEB) {
    /* ── Web card: matches JobCard layout ── */
    return (
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
        <TouchableOpacity activeOpacity={0.97} onPress={handlePress} style={ws.card}>
          {/* Left accent bar */}
          <View style={[ws.cardAccent, { backgroundColor: accentColor }]} />

          {/* Card body */}
          <View style={ws.cardBody}>
            {/* Available / NEW badges */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={[ws.statusBadge, { backgroundColor: item.available ? '#16a34a' : '#6b7280' }]}>
                <Text style={ws.statusBadgeTxt}>{item.available ? 'Available' : 'Occupied'}</Text>
              </View>
              {item.listedDaysAgo != null && item.listedDaysAgo <= 7 && (
                <View style={[ws.statusBadge, { backgroundColor: ORANGE }]}>
                  <Text style={ws.statusBadgeTxt}>NEW</Text>
                </View>
              )}
            </View>

            {/* Title + Rent */}
            <View style={ws.cardTitleRow}>
              <Text style={ws.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={ws.rentWrap}>
                <Text style={ws.rentAmt}>{item.rent}</Text>
                {item.deposit && <Text style={ws.depositTxt}>Dep: {item.deposit}</Text>}
              </View>
            </View>

            {/* Location */}
            <View style={ws.locationRow}>
              <Ionicons name="location-outline" size={12} color="#aaa" />
              <Text style={ws.locationTxt}>
                {item.location}{item.listedDaysAgo != null ? ` · ${item.listedDaysAgo}d ago` : ''}
              </Text>
            </View>

            {/* Tag chips */}
            <View style={ws.tagsRow}>
              {item.type && (
                <View style={ws.tag}>
                  <Ionicons name="business-outline" size={10} color="#555" style={{ marginRight: 3 }} />
                  <Text style={ws.tagTxt}>{item.type}</Text>
                </View>
              )}
              {item.for && item.for !== 'Any' && (
                <View style={ws.tag}>
                  <Ionicons name="people-outline" size={10} color="#555" style={{ marginRight: 3 }} />
                  <Text style={ws.tagTxt}>{item.for}</Text>
                </View>
              )}
              {item.available && (
                <View style={[ws.tag, ws.tagGreen]}>
                  <Ionicons name="checkmark-circle" size={11} color="#16a34a" style={{ marginRight: 3 }} />
                  <Text style={[ws.tagTxt, { color: '#16a34a' }]}>Available</Text>
                </View>
              )}
              {item.owner?.verified && (
                <View style={[ws.tag, ws.tagBlue]}>
                  <Ionicons name="shield-checkmark" size={11} color="#0891b2" style={{ marginRight: 3 }} />
                  <Text style={[ws.tagTxt, { color: '#0891b2' }]}>Verified</Text>
                </View>
              )}
            </View>

            {/* Amenity chips */}
            {item.amenities?.length > 0 && (
              <View style={ws.amenitiesRow}>
                {item.amenities.map((a, i) => (
                  <View key={i} style={ws.amenityChip}>
                    <Ionicons name="checkmark-circle" size={11} color="#16a34a" style={{ marginRight: 3 }} />
                    <Text style={ws.amenityTxt}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer: owner + View button */}
            <View style={ws.cardFooter}>
              <View style={ws.ownerRow}>
                <View style={ws.ownerAvatar}>
                  <Text style={ws.ownerInitial}>{(item.owner?.name || 'O')[0].toUpperCase()}</Text>
                </View>
                <Text style={ws.ownerName} numberOfLines={1}>{item.owner?.name || 'Owner'}</Text>
              </View>
              <TouchableOpacity style={ws.viewBtn} onPress={handlePress}>
                <Text style={ws.viewBtnTxt}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* ── Mobile card: image on top + info below (matches Image 1) ── */
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity activeOpacity={0.97} onPress={handlePress} style={s.card}>

        {/* Photo area */}
        <View style={[s.cardPhoto, { backgroundColor: cardBg }]}>
          <Ionicons name="home-outline" size={48} color="#fff" style={{ opacity: 0.15 }} />
          <View style={[s.availBadge, { backgroundColor: item.available ? '#16a34a' : '#6b7280' }]}>
            <Text style={s.availTxt}>{item.available ? 'Available' : 'Occupied'}</Text>
          </View>
          {item.listedDaysAgo != null && item.listedDaysAgo <= 7 && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeTxt}>NEW</Text>
            </View>
          )}
        </View>

        {/* Info area */}
        <View style={s.cardInfo}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={s.cardMetaRow}>
            <View style={s.cardMetaChip}>
              <Ionicons name="location-outline" size={11} color="#888" />
              <Text style={s.cardMetaTxt}>{item.location}</Text>
            </View>
            {item.for && item.for !== 'Any' && (
              <View style={s.cardMetaChip}>
                <Ionicons name="person-outline" size={11} color="#888" />
                <Text style={s.cardMetaTxt}>{item.for}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <View style={s.rentPill}>
              <Text style={s.rentPillTxt}>{item.rent}</Text>
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
export default function RoomScreen({ route }) {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const showSidebar = IS_WEB && width >= 900;

  const [roomType,   setRoomType]   = useState('All');
  const [search,     setSearch]     = useState(route?.params?.searchQuery || '');
  const [sortBy,     setSortBy]     = useState('recent');
  const [rentRange,  setRentRange]  = useState(RENT_RANGES[0]);
  const [showSort,   setShowSort]   = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [rooms,      setRooms]      = useState(ROOMS);
  const [refreshing, setRefreshing] = useState(false);

  const sheetY = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    if (showFilter) {
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
    } else {
      Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: true }).start();
    }
  }, [showFilter]);

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await http('GET', '/api/rooms');
      if (res.ok && res.rooms?.length > 0) {
        setRooms(res.rooms.map((r) => ({
          id:            String(r.id),
          title:         r.title || r.name || 'Room',
          location:      r.area  || r.location || 'Nanded',
          type:          r.room_type || r.type || '1BHK',
          rent:          r.monthly_rent ? `₹${r.monthly_rent}/mo` : (r.rent || 'Price on request'),
          rentNum:       r.monthly_rent || 0,
          available:     r.available !== false,
          description:   r.description || '',
          amenities:     r.amenities   || [],
          for:           r.suitable_for || r.for || 'Any',
          listedDaysAgo: r.created_at
            ? Math.ceil((Date.now() - new Date(r.created_at)) / 86400000) : null,
          deposit:  r.deposit || null,
          owner:    { name: r.owner_name || r.poster_name || 'Owner', verified: !!r.verified },
          phone:    r.phone || r.whatsapp || '',
        })));
      }
    } catch (_) {}
    finally { setRefreshing(false); }
  }, []);

  const filtered = useMemo(() => {
    let list = rooms.filter(r => {
      const matchType   = roomType === 'All' || r.type === roomType || r.for === roomType;
      const matchSearch = !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.toLowerCase().includes(search.toLowerCase()) ||
        r.type?.toLowerCase().includes(search.toLowerCase());
      const matchRent   = r.rentNum >= rentRange.min && r.rentNum <= rentRange.max;
      return matchType && matchSearch && matchRent;
    });
    if (sortBy === 'rentAsc')  list = [...list].sort((a, b) => a.rentNum - b.rentNum);
    if (sortBy === 'rentDesc') list = [...list].sort((a, b) => b.rentNum - a.rentNum);
    if (sortBy === 'recent')   list = [...list].sort((a, b) => (a.listedDaysAgo ?? 99) - (b.listedDaysAgo ?? 99));
    return list;
  }, [rooms, roomType, search, sortBy, rentRange]);

  const activeFiltersCount = (roomType !== 'All' ? 1 : 0) + (rentRange.label !== 'Any' ? 1 : 0);

  /* ── Shared header ── */
  const Header = (
    <View style={IS_WEB ? ws.header : s.header}>
      <View style={s.titleRow}>
        <View>
          <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>
            Rooms in <Text style={{ color: ORANGE }}>Nanded</Text>
          </Text>
          <Text style={IS_WEB ? ws.pageCount : s.pageCount}>
            {filtered.length} listings found
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[s.iconBtn, IS_WEB && ws.iconBtn]} onPress={() => setShowSort(true)}>
            <Ionicons name="swap-vertical-outline" size={18} color="#444" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, activeFiltersCount > 0 && s.iconBtnActive, IS_WEB && ws.iconBtn]}
            onPress={() => setShowFilter(true)}
          >
            <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? '#fff' : '#444'} />
            {activeFiltersCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.searchWrap, IS_WEB && ws.searchWrap]}>
        <Ionicons name="search-outline" size={18} color="#bbb" style={{ marginLeft: 14 }} />
        <TextInput
          style={[s.searchInput, IS_WEB && ws.searchInput]}
          placeholder="Search area, type, amenity..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingHorizontal: 8 }}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.searchFilterBtn, IS_WEB && ws.searchFilterBtn]}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="filter-outline" size={17} color={ORANGE} />
          {IS_WEB && <Text style={ws.filterBtnTxt}>Filters</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.pillsRow, IS_WEB && ws.pillsRow]}
        style={{ maxHeight: 52 }}
      >
        {ROOM_TYPES.map(rt => (
          <TouchableOpacity
            key={rt}
            onPress={() => setRoomType(rt)}
            style={[s.pill, IS_WEB && ws.pill, roomType === rt && s.pillActive]}
          >
            <Text style={[s.pillTxt, roomType === rt && s.pillTxtActive]}>{rt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {IS_WEB && activeFiltersCount > 0 && (
        <View style={ws.activeFiltersRow}>
          <Text style={ws.activeFiltersLabel}>Active filters:</Text>
          {roomType !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setRoomType('All')}>
              <Text style={ws.activeChipTxt}>{roomType}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {rentRange.label !== 'Any' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setRentRange(RENT_RANGES[0])}>
              <Text style={ws.activeChipTxt}>{rentRange.label}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const ListHeader = <FadeIn delay={180}><TrendingBanner /></FadeIn>;

  const SortModal = (
    <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSort(false)} />
      <View style={[s.sheet, IS_WEB && ws.centeredModal]}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Sort By</Text>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[s.rangeRow, sortBy === opt.value && s.rangeActive]}
            onPress={() => { setSortBy(opt.value); setShowSort(false); }}
          >
            <Text style={[s.rangeTxt, sortBy === opt.value && { color: ORANGE, fontWeight: '700' }]}>{opt.label}</Text>
            {sortBy === opt.value && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );

  const FilterModal = (
    <Modal visible={showFilter} transparent animationType="none" onRequestClose={() => setShowFilter(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
      <Animated.View style={[s.sheet, IS_WEB && ws.centeredModal, { transform: [{ translateY: IS_WEB ? 0 : sheetY }] }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filters</Text>
          <TouchableOpacity onPress={() => { setRoomType('All'); setRentRange(RENT_RANGES[0]); }}>
            <Text style={s.resetTxt}>Reset All</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.filterLabel}>Room Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {ROOM_TYPES.map(rt => (
            <TouchableOpacity key={rt} onPress={() => setRoomType(rt)} style={[s.pill, roomType === rt && s.pillActive, { marginBottom: 0 }]}>
              <Text style={[s.pillTxt, roomType === rt && s.pillTxtActive]}>{rt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[s.filterLabel, { marginTop: 16 }]}>Monthly Rent</Text>
        {RENT_RANGES.map(rr => (
          <TouchableOpacity
            key={rr.label}
            style={[s.rangeRow, rentRange.label === rr.label && s.rangeActive]}
            onPress={() => setRentRange(rr)}
          >
            <Text style={[s.rangeTxt, rentRange.label === rr.label && { color: ORANGE, fontWeight: '700' }]}>{rr.label}</Text>
            {rentRange.label === rr.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilter(false)}>
          <Text style={s.applyFilterTxt}>Apply Filters</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );

  const Empty = (
    <View style={s.emptyWrap}>
      <Ionicons name="home-outline" size={52} color="#d1d5db" />
      <Text style={s.emptyTxt}>No rooms found</Text>
      <TouchableOpacity onPress={() => { setRoomType('All'); setSearch(''); setRentRange(RENT_RANGES[0]); }}>
        <Text style={s.emptyClear}>Clear filters</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Web 3-column layout (matches Jobs page exactly) ── */
  if (IS_WEB && width >= 600) {
    return (
      <View style={ws.root}>
        <View style={ws.body}>

          {/* ── LEFT SIDEBAR ── */}
          {showSidebar && (
            <View style={ws.leftSidebar}>

              {/* Post CTA — matches Jobs "Post Jobs Free" */}
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>HAVE A ROOM?</Text>
                <Text style={ws.ctaTitle}>List your room free</Text>
                <Text style={ws.ctaSub}>Reach 10,000+ seekers in Nanded instantly.</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('PostRoom')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>Post a Room</Text>
                </TouchableOpacity>
              </SideCard>

              {/* Browse by Room Type — matches Jobs "Browse Categories" */}
              <SideCard>
                <Text style={ws.sideTitle}>Browse Types</Text>
                {ROOM_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt}
                    style={ws.catRow}
                    onPress={() => setRoomType(rt)}
                    activeOpacity={0.75}
                  >
                    <View style={ws.catIconWrap}>
                      <Ionicons
                        name={
                          rt === 'All' ? 'home-outline' :
                          rt === 'PG' ? 'people-outline' :
                          rt === '1BHK' || rt === '2BHK' ? 'business-outline' :
                          rt === 'Male' ? 'man-outline' :
                          rt === 'Female' ? 'woman-outline' : 'bed-outline'
                        }
                        size={14} color={ORANGE}
                      />
                    </View>
                    <Text style={[ws.catLabel, roomType === rt && { color: ORANGE, fontWeight: '700' }]}>{rt}</Text>
                    {roomType === rt && <Ionicons name="checkmark-circle" size={14} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Explore More — matches Jobs "Explore More" */}
              <SideCard>
                <Text style={ws.sideTitle}>Explore More</Text>
                <QuickAction icon="briefcase-outline"  label="Find a Job"     color={ORANGE}   onPress={() => nav.navigate('Board')} />
                <QuickAction icon="car-sport-outline"  label="Rent a Vehicle" color="#9333ea"  onPress={() => nav.navigate('Cars')} />
                <QuickAction icon="pricetag-outline"   label="Buy & Sell"     color="#0ea5e9"  onPress={() => nav.navigate('BuySell')} />
              </SideCard>

            </View>
          )}

          {/* ── MAIN COLUMN ── */}
          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              data={filtered}
              keyExtractor={r => r.id}
              contentContainerStyle={ws.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRooms(true)} tintColor={ORANGE} colors={[ORANGE]} />}
              ListHeaderComponent={<>{Header}{ListHeader}</>}
              ListEmptyComponent={Empty}
              renderItem={({ item, index }) => (
                <RoomCard item={item} index={index} onPress={() => nav.navigate('RoomDetail', { room: item })} />
              )}
            />
          </View>

          {/* ── RIGHT SIDEBAR ── */}
          {showSidebar && (
            <View style={ws.rightSidebar}>

              {/* Sort By */}
              <SideCard>
                <Text style={ws.sideTitle}>Sort By</Text>
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[ws.sortRow, sortBy === opt.value && ws.sortRowActive]}
                    onPress={() => setSortBy(opt.value)}
                  >
                    <Text style={[ws.sortTxt, sortBy === opt.value && ws.sortTxtActive]}>{opt.label}</Text>
                    {sortBy === opt.value && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Rent Range */}
              <SideCard>
                <Text style={ws.sideTitle}>Rent Range</Text>
                {RENT_RANGES.map(rr => (
                  <TouchableOpacity
                    key={rr.label}
                    style={[ws.sortRow, rentRange.label === rr.label && ws.sortRowActive]}
                    onPress={() => setRentRange(rr)}
                  >
                    <Text style={[ws.sortTxt, rentRange.label === rr.label && ws.sortTxtActive]}>{rr.label}</Text>
                    {rentRange.label === rr.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Room Type */}
              <SideCard>
                <Text style={ws.sideTitle}>Room Type</Text>
                {ROOM_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt}
                    style={[ws.sortRow, roomType === rt && ws.sortRowActive]}
                    onPress={() => setRoomType(rt)}
                  >
                    <Text style={[ws.sortTxt, roomType === rt && ws.sortTxtActive]}>{rt}</Text>
                    {roomType === rt && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Renting Tips */}
              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>🏠 Renting Tips</Text>
                {[
                  'Verify owner identity before deposit',
                  'Visit in person before finalising',
                  'Check water & electricity supply',
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

  /* ── Mobile layout ── */
  return (
    <View style={s.container}>
      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={<>{Header}{ListHeader}</>}
        contentContainerStyle={s.list}
        ListEmptyComponent={Empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRooms(true)} tintColor={ORANGE} colors={[ORANGE]} />}
        renderItem={({ item, index }) => (
          <RoomCard item={item} index={index} onPress={() => nav.navigate('RoomDetail', { room: item })} />
        )}
      />
      {SortModal}{FilterModal}
    </View>
  );
}

/* ─────────────────────────── MOBILE STYLES ─────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingHorizontal: 12, paddingBottom: 48 },

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
  searchFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 48, paddingHorizontal: 16,
    backgroundColor: '#fff7f0', borderLeftWidth: 1, borderLeftColor: '#ebebeb',
  },

  pillsRow: { gap: 8, paddingBottom: 4, alignItems: 'center' },
  pill: {
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 100,
  },
  pillActive:    { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:       { fontSize: 13, fontWeight: '600', color: '#555' },
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

  /* Mobile card */
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#ebebeb', marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardPhoto: {
    height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  availBadge: {
    position: 'absolute', top: 10, left: 10,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10,
  },
  availTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  newBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10,
  },
  newBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },

  cardInfo:  { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardDesc:  { fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fafafa',
  },
  cardMetaTxt: { fontSize: 11, color: '#666', fontWeight: '500' },
  rentPill:    { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12 },
  rentPillTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTxt:   { color: '#9ca3af', fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyClear: { color: ORANGE, fontWeight: '700', marginTop: 8, fontSize: 13 },

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
});

/* ─────────────────────────── WEB STYLES (mirrors BoardScreen ws exactly) ─────────────────────────── */
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
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 18, borderRadius: 100,
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

  /* Web card (JobCard-matching) */
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#ebebeb', marginBottom: 12,
    overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardAccent: { width: 4, flexShrink: 0 },
  cardBody:   { flex: 1, padding: 16 },

  statusBadge:    { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  statusBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 8 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#111', flex: 1, lineHeight: 21 },
  rentWrap:     { alignItems: 'flex-end', flexShrink: 0 },
  rentAmt:      { fontSize: 13, fontWeight: '700', color: ORANGE },
  depositTxt:   { fontSize: 10, color: '#999', marginTop: 1 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  locationTxt: { fontSize: 12, color: '#888', fontWeight: '500' },

  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0',
    paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fafafa',
  },
  tagGreen: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  tagBlue:  { borderColor: '#a5f3fc', backgroundColor: '#ecfeff' },
  tagTxt:   { fontSize: 11, color: '#555', fontWeight: '500' },

  amenitiesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 20,
    borderWidth: 1, borderColor: '#bbf7d0',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  amenityTxt: { fontSize: 11, color: '#16a34a', fontWeight: '600' },

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
});
