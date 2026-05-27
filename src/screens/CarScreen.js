import React, { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
  Animated, Easing, Platform, StatusBar, useWindowDimensions, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';
import PromoBanner, { BannerCard, BannerWithPicker, TemplatePicker } from '../components/PromoBanner';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';
import { useDistrict } from '../context/DistrictContext';

const ORANGE  = '#f97316';
const IS_WEB  = Platform.OS === 'web';

const VEHICLE_TYPES = ['All', 'Car', 'Bike', 'Auto', 'SUV'];

const PRICE_RANGES = [
  { label: 'Any',           min: 0,   max: Infinity },
  { label: 'Under ₹500/d', min: 0,   max: 500 },
  { label: '₹500–₹1k/d',  min: 500, max: 1000 },
  { label: '₹1k–₹2k/d',  min: 1000, max: 2000 },
  { label: 'Above ₹2k/d', min: 2000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: 'Most Recent',   value: 'recent' },
  { label: 'Lowest Price',  value: 'priceAsc' },
  { label: 'Highest Price', value: 'priceDesc' },
];

const CARD_COLORS = ['#1a2a3a', '#4a1942', '#1a3a2a', '#2a2030', '#1e3a5f', '#3a2a1a'];

export const CARS = [];

/* ─── Animated fade-in wrapper ─── */
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(ty,      { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
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
        Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: Platform.OS !== 'web' }),
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

/* ─── Top Vehicles Banner ─── */
function TopVehiclesBanner() {
  const { t, lang } = useLang();
  const { currentDistrict } = useDistrict();
  const districtLocalName = currentDistrict
    ? (lang === 'mr' ? (currentDistrict.nameMarathi || currentDistrict.name)
     : lang === 'hi' ? (currentDistrict.nameHindi   || currentDistrict.name)
     : currentDistrict.name)
    : 'Nanded';
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);
  return (
    <View style={s.trendingBanner}>
      <View style={s.trendingAccent} />
      <Animated.View style={[s.trendingIconWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="car-sport" size={20} color={ORANGE} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={s.trendingTitle}>{t('topListingsThisWeek')}</Text>
        <Text style={s.trendingSub}>{t('carsAvailable').replace('{DISTRICT}', districtLocalName || '')}</Text>
      </View>
      <View style={s.liveBadge}>
        <PulseDot />
        <Text style={s.liveTxt}>{t('live')}</Text>
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

/* ─── Vehicle Card ─── */
function VehicleCard({ item, index, onPress }) {
  const { lang, t } = useLang();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, delay: index * 70, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slide, { toValue: 0, duration: 360, delay: index * 70, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', damping: 10, stiffness: 200 }),
    ]).start();
    onPress?.();
  };

  const cardBg   = CARD_COLORS[index % CARD_COLORS.length];
  const iconName = (item.type === 'Bike' || item.type === 'Bike / Scooter') ? 'bicycle'
                 : item.type === 'Auto' ? 'car-outline' : 'car-sport';
  const daysAgo  = item.daysLeft !== null
    ? `${Math.max(0, 30 - (item.daysLeft || 30))}d ago` : null;
  const isNew    = item.daysLeft !== null && (30 - (item.daysLeft || 30)) <= 7;

  if (IS_WEB) {
    const photoCount = item.photos || 0;
    const firstPhoto = item.photoUrls?.[0] || null;
    const webPhotoPills = [item.type, item.fuel || null, item.ac ? 'AC' : null].filter(Boolean).slice(0, 3);
    return (
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
        <TouchableOpacity activeOpacity={0.97} onPress={handlePress} style={ws.card}>
          <View style={[ws.cardPhoto, { backgroundColor: firstPhoto ? '#000' : cardBg }]}>
            {firstPhoto ? (
              <Image
                source={{ uri: firstPhoto }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
            ) : (
              <Ionicons name={iconName} size={64} color="rgba(255,255,255,0.14)" />
            )}
            <View style={ws.photoOverlay} />
            {webPhotoPills.length > 0 && (
              <View style={ws.photoPillsRow}>
                {webPhotoPills.map((label, i) => (
                  <View key={i} style={[ws.photoPill, i === 0 && ws.photoPillActive]}>
                    <Text style={[ws.photoPillTxt, i === 0 && ws.photoPillTxtActive]}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={ws.photosBadge}>
              <Text style={ws.photosBadgeTxt}>
                {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'photos'}
              </Text>
            </View>
            <View style={[ws.availBadge, { backgroundColor: '#111' }]}>
              <Text style={ws.availTxt}>{item.price}</Text>
            </View>
            {isNew && <View style={ws.newBadge}><Text style={ws.newBadgeTxt}>{t('newBadge')}</Text></View>}
          </View>
          <View style={ws.cardBody}>
            <View style={ws.cardTitleRow}>
              <AutoTranslate text={item.name} lang={lang} style={ws.cardTitle} numberOfLines={1} />
              <View style={ws.priceWrap}><Text style={ws.priceAmt}>{item.price}</Text></View>
            </View>
            <View style={ws.locationRow}>
              <Ionicons name="location-outline" size={12} color="#aaa" />
              <Text style={ws.locationTxt}>{item.location}{daysAgo ? ` · ${daysAgo}` : ''}</Text>
            </View>
            <View style={ws.tagsRow}>
              {item.type && (
                <View style={ws.tag}>
                  <Ionicons name={iconName} size={10} color="#555" style={{ marginRight: 3 }} />
                  <Text style={ws.tagTxt}>{item.type}</Text>
                </View>
              )}
              {item.subtitle
                ? item.subtitle.split(' · ').slice(0, 2).map((spec, i) => (
                    <View key={i} style={[ws.tag, ws.tagBlue]}>
                      <Text style={[ws.tagTxt, { color: '#0369a1' }]}>{spec}</Text>
                    </View>
                  ))
                : null}
            </View>
            <View style={ws.cardFooter}>
              <View style={ws.ownerRow}>
                <View style={ws.ownerAvatar}>
                  <Text style={ws.ownerInitial}>{(item.owner?.name || 'O')[0].toUpperCase()}</Text>
                </View>
                <Text style={ws.ownerName} numberOfLines={1}>{item.owner?.name || 'Owner'}</Text>
              </View>
              <View style={ws.viewBtn}><Text style={ws.viewBtnTxt}>{t('viewDetailsCar')}</Text></View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* Mobile card */
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity activeOpacity={0.97} onPress={handlePress} style={s.card}>
        <View style={[s.cardPhoto, { backgroundColor: item.photoUrls?.[0] ? '#000' : cardBg }]}>
          {item.photoUrls?.[0] ? (
            <Image
              source={{ uri: item.photoUrls[0] }}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
          ) : (
            <Ionicons name={iconName} size={58} color="rgba(255,255,255,0.14)" />
          )}
          <View style={s.photoOverlay} />
          <View style={s.photosBadge}>
            <Text style={s.photosBadgeTxt}>
              {item.photos > 0 ? `${item.photos} photo${item.photos > 1 ? 's' : ''}` : 'photos'}
            </Text>
          </View>
          <View style={[s.availBadge, { backgroundColor: '#111' }]}>
            <Text style={s.availTxt}>{item.price}</Text>
          </View>
          {isNew && <View style={s.newBadge}><Text style={s.newBadgeTxt}>{t('newBadge')}</Text></View>}
        </View>
        <View style={s.cardInfo}>
          <AutoTranslate text={item.name} lang={lang} style={s.cardTitle} numberOfLines={1} />
          <AutoTranslate text={item.subtitle} lang={lang} style={s.cardDesc} numberOfLines={1} />
          <View style={s.cardMetaRow}>
            {item.location && (
              <View style={s.cardMetaChip}>
                <Ionicons name="location-outline" size={11} color="#888" />
                <Text style={s.cardMetaTxt}>{item.location}</Text>
              </View>
            )}
            {item.type && (
              <View style={s.cardMetaChip}>
                <Ionicons name={iconName} size={11} color="#888" />
                <Text style={s.cardMetaTxt}>{item.type}</Text>
              </View>
            )}
            {daysAgo && (
              <View style={s.cardMetaChip}>
                <Ionicons name="time-outline" size={11} color="#888" />
                <Text style={s.cardMetaTxt}>{daysAgo}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */
export default function CarsScreen({ route }) {
  const nav    = useNavigation();
  const { lang, t, tDistrict } = useLang();
  const { currentDistrict } = useDistrict();
  const insets = useSafeAreaInsets();
  // Localised district name for Marathi/Hindi display
  const districtLocalName = currentDistrict
    ? (lang === 'mr' ? (currentDistrict.nameMarathi || currentDistrict.name)
     : lang === 'hi' ? (currentDistrict.nameHindi   || currentDistrict.name)
     : currentDistrict.name)
    : 'Nanded';
  const { width: winW } = useWindowDimensions();

  const [search,      setSearch]      = useState(route?.params?.searchQuery || '');
  const [vehicleType, setVehicleType] = useState('All');
  const [priceRange,  setPriceRange]  = useState(PRICE_RANGES[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [cars,        setCars]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [promos,      setPromos]      = useState([]);

  const showSidebar = IS_WEB && winW >= 900;

  // ── Scroll animation for sticky mini-header ──────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  const titleScale = scrollY.interpolate({
    inputRange: [0, 80], outputRange: [1, 0.88], extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 100], outputRange: [1, 0.6], extrapolate: 'clamp',
  });
  const searchTranslate = scrollY.interpolate({
    inputRange: [0, 60], outputRange: [0, -4], extrapolate: 'clamp',
  });
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 120], outputRange: [1, 0.85], extrapolate: 'clamp',
  });

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

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const districtParam = currentDistrict?.id ? `?district=${currentDistrict.id}` : '';
      const res = await http('GET', `/api/vehicles${districtParam}`);
      if (res.ok && res.vehicles) {
        const mapped = res.vehicles.map(v => ({
          id:       String(v.id),
          name:     v.name,
          subtitle: [v.color, v.fuel_type, v.ac_type, v.seats ? `${v.seats} seats` : ''].filter(Boolean).join(' · '),
          price:    v.daily_rate ? `₹${v.daily_rate}/day` : 'Price on request',
          priceNum: v.daily_rate || 0,
          location: v.area || 'Nanded',
          type:     v.vehicle_type || 'Car',
          fuel:     v.fuel_type || '',
          ac:       !!v.ac_type,
          photoUrls: (() => {
            try {
              const raw = v.photos;
              if (Array.isArray(raw)) return raw;
              if (typeof raw === 'string') return JSON.parse(raw);
              return [];
            } catch { return []; }
          })(),
          photos:   (() => {
            try {
              const raw = v.photos;
              if (Array.isArray(raw)) return raw.length;
              if (typeof raw === 'string') return JSON.parse(raw).length;
              return 0;
            } catch { return 0; }
          })(),
          whatsapp: v.whatsapp,
          owner:    { name: v.owner_name || v.poster_name || 'Owner', area: v.area || 'Nanded' },
          daysLeft: v.expires_at
            ? Math.max(0, Math.ceil((new Date(v.expires_at) - Date.now()) / 86400000))
            : null,
          postedAt: v.created_at ? new Date(v.created_at).getTime() : 0,
        }));
        setCars(mapped);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  useEffect(() => {
    if (currentDistrict?.id) fetchCars();
  }, [currentDistrict?.id]);

  useEffect(() => {
    http('GET', '/api/promotions/all').then(res => {
      if (res?.ok && Array.isArray(res.promotions)) setPromos(res.promotions);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = cars.filter(c => {
      const matchType   = vehicleType === 'All' || c.type === vehicleType;
      const matchPrice  = c.priceNum >= priceRange.min && c.priceNum <= priceRange.max;
      const matchSearch = search === '' ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase()) ||
        c.type?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchPrice && matchSearch;
    });
    list = [...list].sort((a, b) => b.postedAt - a.postedAt);
    return list;
  }, [cars, vehicleType, priceRange, search]);

  const activeFilters = [
    vehicleType !== 'All'      ? vehicleType      : null,
    priceRange.label !== 'Any' ? priceRange.label : null,
  ].filter(Boolean);

  const Header = (
    <View style={IS_WEB ? ws.header : s.header}>
      {/* Title row */}
      <View style={s.titleRow}>

        <Animated.View style={{ flex: 1, opacity: titleOpacity }}>
          <Text style={IS_WEB ? ws.pageTitle : s.pageTitle} numberOfLines={IS_WEB ? undefined : 1} adjustsFontSizeToFit={!IS_WEB} minimumFontScale={0.7}>
            <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
              <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>{t('vehiclesInNanded').split('{DISTRICT}')[0]}<Text style={{ color: ORANGE }}>{districtLocalName}</Text>{t('vehiclesInNanded').split('{DISTRICT}')[1] || ''}</Text>
            </TouchableOpacity>
          </Text>
          <Text style={IS_WEB ? ws.pageCount : s.pageCount}>{filtered.length} {t('listingsFound')}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <TouchableOpacity
            style={[s.iconBtn, activeFilters.length > 0 && s.iconBtnActive, IS_WEB && ws.iconBtn]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilters.length > 0 ? '#fff' : '#444'} />
            {activeFilters.length > 0 && (
              <View style={s.filterBadge}><Text style={s.filterBadgeTxt}>{activeFilters.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search — animates on scroll */}
      <Animated.View style={[
        s.searchWrap, IS_WEB && ws.searchWrap,
        { transform: [{ translateY: searchTranslate }], opacity: searchOpacity },
      ]}>
        <Ionicons name="search-outline" size={18} color="#bbb" style={{ marginLeft: 14 }} />
        <TextInput
          style={[s.searchInput, IS_WEB && ws.searchInput]}
          placeholder={t('searchVehiclePlaceholder')}
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
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter-outline" size={17} color={ORANGE} />
          {IS_WEB && <Text style={ws.filterBtnTxt}>{t('filters')}</Text>}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.pillsRow, IS_WEB && ws.pillsRow]}
        style={{ maxHeight: 52 }}>
        {VEHICLE_TYPES.map(vt => (
          <TouchableOpacity key={vt} onPress={() => setVehicleType(vt)}
            style={[s.pill, IS_WEB && ws.pill, vehicleType === vt && s.pillActive]}>
            <Text style={[s.pillTxt, vehicleType === vt && s.pillTxtActive]}>{vt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {IS_WEB && activeFilters.length > 0 && (
        <View style={ws.activeFiltersRow}>
          <Text style={ws.activeFiltersLabel}>{t('activeFilters')}</Text>
          {activeFilters.map((f, i) => (
            <TouchableOpacity key={i} style={ws.activeChip}
              onPress={() => { if (f === vehicleType) setVehicleType('All'); else setPriceRange(PRICE_RANGES[0]); }}>
              <Text style={ws.activeChipTxt}>{f}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const defaultPromo = {
    name:        'Advertise Your Vehicle Business',
    tagline:     `Reach thousands of customers in ${districtLocalName}!`,
    description: 'Rent cars, bikes & autos to people who need them. List your vehicle or promote your transport business here.',
    category:    'transport',
    phone:       '',
    location:    `${districtLocalName}, Maharashtra`,
    plan:        'popular',
  };

  const SponsoredLabel = () => (
    <View style={{ marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ORANGE }} />
      <Text style={{ fontSize: 9, fontWeight: '800', color: '#bbb', letterSpacing: 1 }}>{t('sponsored')}</Text>
    </View>
  );

  const ListHeader = (
    <>
      <FadeIn delay={180}><TopVehiclesBanner /></FadeIn>
      <View style={{ marginHorizontal: 12, marginVertical: 6 }}>
        {promos.length > 0
          ? promos.map(p => (
              <View key={p.id} style={{ marginBottom: 10 }}>
                <SponsoredLabel />
                <BannerCard promo={p} />
              </View>
            ))
          : (
              <>
                <SponsoredLabel />
                <PromoBanner data={defaultPromo} />
              </>
            )}
      </View>
    </>
  );

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
        <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
          <Text style={IS_WEB ? ws.stickyTitle : s.stickyTitle}>
            {t('carsInNanded').split('{DISTRICT}')[0]}<Text style={{ color: ORANGE }}>{districtLocalName}</Text>{t('carsInNanded').split('{DISTRICT}')[1] || ''}
          </Text>
        </TouchableOpacity>
        <View style={IS_WEB ? ws.stickySearch : s.stickySearch}>
          <Ionicons name="search-outline" size={15} color="#bbb" style={{ marginLeft: 10 }} />
          <TextInput
            style={IS_WEB ? ws.stickyInput : s.stickyInput}
            placeholder={t('searchVehiclePlaceholder')}
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
      <Ionicons name="car-outline" size={52} color="#d1d5db" />
      <Text style={s.emptyTxt}>{t('noVehiclesListed')}</Text>
      <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>
        {search || vehicleType !== 'All' ? 'Try adjusting your filters' : 'Be the first to list your vehicle!'}
      </Text>
      {(search || vehicleType !== 'All') && (
        <TouchableOpacity onPress={() => { setSearch(''); setVehicleType('All'); setPriceRange(PRICE_RANGES[0]); }}>
          <Text style={s.emptyClear}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const FilterModal = (
    <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
      <View style={[s.sheet, IS_WEB && ws.centeredModal]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{t('filters')}</Text>
          <TouchableOpacity onPress={() => { setVehicleType('All'); setPriceRange(PRICE_RANGES[0]); }}>
            <Text style={s.resetTxt}>{t('reset')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.filterLabel}>{t('vehicleType')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          {VEHICLE_TYPES.map(vt => (
            <TouchableOpacity key={vt} onPress={() => setVehicleType(vt)}
              style={[s.pill, vehicleType === vt && s.pillActive]}>
              <Text style={[s.pillTxt, vehicleType === vt && s.pillTxtActive]}>{vt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.filterLabel}>{t('priceRange')}</Text>
        {PRICE_RANGES.map(pr => (
          <TouchableOpacity key={pr.label} style={[s.rangeRow, priceRange.label === pr.label && s.rangeActive]}
            onPress={() => setPriceRange(pr)}>
            <Text style={[s.rangeTxt, priceRange.label === pr.label && { color: ORANGE, fontWeight: '700' }]}>{pr.label}</Text>
            {priceRange.label === pr.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilters(false)}>
          <Text style={s.applyFilterTxt}>{t('applyFilters')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  /* ══════════ WEB LAYOUT ══════════ */
  if (IS_WEB) {
    return (
      <View style={ws.root}>
        <View style={ws.topBar}>
          <TouchableOpacity style={ws.topBarBack} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
            <Text style={ws.topBarTitle}>{t('cars')}</Text>
          </TouchableOpacity>
        </View>

        {StickyHeader}

        <View style={ws.body}>
          {showSidebar && (
            <View style={ws.leftSidebar}>
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>{t('vehicleOwner')}</Text>
                <Text style={ws.ctaTitle}>{t('listYourVehicle')}</Text>
                <Text style={ws.ctaSub}>{t('listYourVehicleSub').replace('{DISTRICT}', districtLocalName || '')}</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('PostCar')}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>{t('postAVehicle')}</Text>
                </TouchableOpacity>
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>{t('browseTypes')}</Text>
                {VEHICLE_TYPES.map(vt => (
                  <TouchableOpacity key={vt} style={ws.catRow} onPress={() => setVehicleType(vt)} activeOpacity={0.75}>
                    <View style={ws.catIconWrap}>
                      <Ionicons
                        name={vt === 'All' ? 'grid-outline' : vt === 'Bike' ? 'bicycle-outline' :
                              vt === 'Auto' ? 'car-outline' : vt === 'SUV' ? 'bus-outline' : 'car-sport-outline'}
                        size={14} color={ORANGE}
                      />
                    </View>
                    <Text style={[ws.catLabel, vehicleType === vt && { color: ORANGE, fontWeight: '700' }]}>{vt}</Text>
                    {vehicleType === vt && <Ionicons name="checkmark-circle" size={14} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>{t('exploreMore')}</Text>
                <QuickAction icon="briefcase-outline" label={t('findAJob')}  color={ORANGE}  onPress={() => nav.navigate('Jobs')} />
                <QuickAction icon="home-outline"      label={t('findARoom')} color="#0d9488" onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="pricetag-outline"  label={t('buySell')}  color="#0ea5e9" onPress={() => nav.navigate('BuySell')} />
              </SideCard>
            </View>
          )}

          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              data={filtered}
              keyExtractor={c => c.id}
              contentContainerStyle={ws.list}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCars(true)} tintColor={ORANGE} colors={[ORANGE]} />}
              ListHeaderComponent={<>{Header}{ListHeader}</>}
              ListEmptyComponent={Empty}
              renderItem={({ item, index }) => (
                <VehicleCard item={item} index={index} onPress={() => nav.navigate('CarDetail', { car: item })} />
              )}
            />
          </View>

          {showSidebar && (
            <View style={ws.rightSidebar}>
              <SideCard>
                <Text style={ws.sideTitle}>{t('priceRange')}</Text>
                {PRICE_RANGES.map(pr => (
                  <TouchableOpacity key={pr.label} style={[ws.sortRow, priceRange.label === pr.label && ws.sortRowActive]}
                    onPress={() => setPriceRange(pr)}>
                    <Text style={[ws.sortTxt, priceRange.label === pr.label && ws.sortTxtActive]}>{pr.label}</Text>
                    {priceRange.label === pr.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>{t('vehicleType')}</Text>
                {VEHICLE_TYPES.map(vt => (
                  <TouchableOpacity key={vt} style={[ws.sortRow, vehicleType === vt && ws.sortRowActive]}
                    onPress={() => setVehicleType(vt)}>
                    <Text style={[ws.sortTxt, vehicleType === vt && ws.sortTxtActive]}>{vt}</Text>
                    {vehicleType === vt && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>{t('rentalTips')}</Text>
                {['Verify owner identity before paying', 'Inspect vehicle before taking delivery', 'Check insurance & documents'].map((tip, i) => (
                  <View key={i} style={ws.tipRow}>
                    <View style={ws.tipDot} />
                    <Text style={ws.tipTxt}>{tip}</Text>
                  </View>
                ))}
              </SideCard>
            </View>
          )}
        </View>
        {FilterModal}
      </View>
    );
  }

  /* ══════════ MOBILE LAYOUT ══════════ */
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      {StickyHeader}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        ListHeaderComponent={<>{Header}{ListHeader}</>}
        contentContainerStyle={s.list}
        ListEmptyComponent={Empty}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        bounces={false}
        overScrollMode="never"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCars(true)} tintColor={ORANGE} colors={[ORANGE]} />}
        renderItem={({ item, index }) => (
          <VehicleCard item={item} index={index} onPress={() => nav.navigate('CarDetail', { car: item })} />
        )}
      />
      {FilterModal}
    </View>
  );
}

/* ─────────────────────────── MOBILE STYLES ─────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7', overflow: 'hidden' },

  // Sticky mini-header (mobile)
  stickyBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyTitle: { fontSize: 15, fontWeight: '900', color: '#111', letterSpacing: -0.2, flexShrink: 0 },
  stickySearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 10, height: 36,
    borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  stickyInput: { flex: 1, height: 36, paddingHorizontal: 8, fontSize: 13, color: '#111' },
  list: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },

  header: {
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#ececec',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 2 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 14 },

  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ececec',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  iconBtnActive: { backgroundColor: '#111' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8e8e8',
    marginTop: 4, marginBottom: 14, height: 52,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111' },

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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff9f3', borderRadius: 16,
    borderWidth: 1, borderColor: '#fddcb5',
    marginBottom: 12, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
  },
  trendingAccent: {
    width: 5, alignSelf: 'stretch',
    backgroundColor: ORANGE,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
    marginRight: 10,
  },
  trendingIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#fff3e0',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  trendingTitle: { fontSize: 14, fontWeight: '800', color: ORANGE },
  trendingSub:   { fontSize: 11, color: '#999', marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  liveTxt: { fontSize: 10, fontWeight: '800', color: '#16a34a' },

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
  cardDesc:  { fontSize: 12.5, color: '#888', lineHeight: 18, marginBottom: 12 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 11, backgroundColor: '#fafafa',
  },
  cardMetaTxt: { fontSize: 12, color: '#444', fontWeight: '500' },

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

/* ─────────────────────────── WEB STYLES ─────────────────────────── */
const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  // Sticky mini-header (web)
  stickyBar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 999,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  // placeholder — keeps index same as RoomScreen ws
  stickyInner: {
    maxWidth: 1400, width: '100%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    gap: 16, paddingHorizontal: 24, paddingVertical: 10,
  },
  stickyTitle: { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.3, flexShrink: 0 },
  stickySearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 10, height: 38,
    borderWidth: 1.5, borderColor: '#ebebeb', overflow: 'hidden',
  },
  stickyInput: { flex: 1, height: 38, paddingHorizontal: 8, fontSize: 13, color: '#111', outlineStyle: 'none' },

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
  topBarBackTxt: { fontSize: 13, fontWeight: '700', color: '#111' },
  topBarTitle:   { fontSize: 15, fontWeight: '800', color: '#111' },

  header: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 2, flexShrink: 1 },
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
  pillActive:    { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:       { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff' },

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
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 11,
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

  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
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
});
