import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, TextInput, Modal,
  FlatList, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C, CAT_ICONS } from '../utils/constants';
import { useLang, LANGUAGES } from '../utils/i18n';
import { timeAgo, http } from '../utils/api';

const ORANGE    = '#f97316';
const TEAL      = '#0d9488';
const PURPLE    = '#7c3aed';
// Dark ticker colour matching Image 3 reference design
const TICKER_BG = '#1a1a2e';
const { width: SCREEN_W } = Dimensions.get('window');

// ── Animated Pressable ────────────────────────────────────────────────────────
function AnimatedPress({ style, onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity onPress={press} activeOpacity={1}>{children}</TouchableOpacity>
    </Animated.View>
  );
}

// ── FadeSlide ─────────────────────────────────────────────────────────────────
function FadeSlide({ children, delay = 0, fromY = 24, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>
  );
}

// ── Pulsing dot ───────────────────────────────────────────────────────────────
function PulseDot({ color = ORANGE }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.freshnessDot, { backgroundColor: color, transform: [{ scale }] }]} />;
}

// ── Animated stat counter ─────────────────────────────────────────────────────
function AnimatedStat({ value, label, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: value, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, delay);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => { clearTimeout(timer); anim.removeListener(id); };
  }, [value]);
  return (
    <View style={s.statItem}>
      <Text style={s.statNum}>{display}+</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Lang Modal ────────────────────────────────────────────────────────────────
function LangModal({ visible, current, onSelect, onClose }) {
  const slideY = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    Animated.timing(slideY, {
      toValue: visible ? 0 : 300, duration: 320,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [visible]);
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={lm.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[lm.sheet, { transform: [{ translateY: slideY }] }]}>
          <Text style={lm.title}>Choose Language</Text>
          {LANGUAGES.map(l => (
            <TouchableOpacity key={l.code} style={[lm.row, current === l.code && lm.rowActive]}
              onPress={() => { onSelect(l.code); onClose(); }} activeOpacity={0.8}>
              <Text style={[lm.native, current === l.code && lm.nativeActive]}>{l.native}</Text>
              <Text style={lm.label}>{l.label}</Text>
              {current === l.code && <Ionicons name="checkmark-circle" size={18} color={ORANGE} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── One-by-One Ticker — items animate in/out individually, no scrolling gap ───
const TICKER_ITEMS = [
  { icon: 'checkmark-circle',   text: 'HIRING NOW — Nanded' },
  { icon: 'bicycle-outline',    text: 'DELIVERY JOBS AVAILABLE' },
  { icon: 'home-outline',       text: 'ROOMS FOR RENT IN NANDED' },
  { icon: 'car-outline',        text: 'CARS & VEHICLES FOR HIRE' },
  { icon: 'cube-outline',       text: 'BUY & SELL 580+ ITEMS' },
  { icon: 'call-outline',       text: 'TELECALLER JOBS — APPLY NOW' },
  { icon: 'shield-outline',     text: 'SECURITY GUARD VACANCIES' },
  { icon: 'construct-outline',  text: 'CONSTRUCTION WORK AVAILABLE' },
  { icon: 'briefcase-outline',  text: 'DATA ENTRY & OFFICE JOBS' },
  { icon: 'storefront-outline', text: 'LOCAL MARKETPLACE — NANDED' },
];

function TickerBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  const bannerFadeIn  = useRef(new Animated.Value(0)).current;
  const bannerSlideIn = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    // Banner entrance
    Animated.parallel([
      Animated.timing(bannerFadeIn,  { toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bannerSlideIn, { toValue: 0, duration: 400, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    // Cycle through items one by one
    const showItem = () => {
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    };

    showItem();
    const interval = setInterval(() => {
      // Fade out current
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex(prev => (prev + 1) % TICKER_ITEMS.length);
        translateY.setValue(12);
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      });
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const item = TICKER_ITEMS[currentIndex];
  return (
    <Animated.View style={[s.ticker, { opacity: bannerFadeIn, transform: [{ translateY: bannerSlideIn }] }]}>
      <Animated.View style={[s.tickerRow, { opacity, transform: [{ translateY }] }]}>
        <Ionicons name={item.icon} size={14} color="#f97316" style={{ marginRight: 7 }} />
        <Text style={s.tickerText} numberOfLines={1}>{item.text}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── Explore Grid Card ─────────────────────────────────────────────────────────
function ExploreCard({ icon, title, subtitle, color, onPress, style }) {
  return (
    <AnimatedPress style={[s.exploreCard, { backgroundColor: color }, style]} onPress={onPress}>
      <View style={s.exploreInner}>
        <View style={s.exploreIconWrap}>
          <Ionicons name={icon} size={26} color="#fff" />
        </View>
        <View style={s.exploreBadge}>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
        </View>
      </View>
      <Text style={s.exploreTitle}>{title}</Text>
      <Text style={s.exploreSub}>{subtitle}</Text>
      <View style={[s.exploreCircle1, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
      <View style={[s.exploreCircle2, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
    </AnimatedPress>
  );
}

// ── Featured Job Card (horizontal) ───────────────────────────────────────────
function FeaturedJobCard({ job, onPress }) {
  return (
    <AnimatedPress style={s.featJobCard} onPress={onPress}>
      <View style={s.featJobTop}>
        <View style={s.featJobIcon}>
          <Ionicons name={CAT_ICONS[job.category] || 'briefcase-outline'} size={18} color={ORANGE} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.featJobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.featJobCompany} numberOfLines={1}>{job.company}</Text>
        </View>
      </View>
      <View style={s.featJobBottom}>
        <Text style={s.featJobSalary}>{job.salary}</Text>
        <TouchableOpacity style={s.applyBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={s.applyBtnTxt}>Apply</Text>
        </TouchableOpacity>
      </View>
    </AnimatedPress>
  );
}

// ── Recent Room Card — supports both DB shape and local shape ─────────────────
function RecentRoomCard({ room, onPress }) {
  const title    = room.title    || (room.bhk_size ? `${room.bhk_size} – ${room.area}` : room.area || 'Room');
  const location = room.location || room.area || 'Nanded';
  const type     = room.type     || room.room_type || room.bhk_size || 'Room';
  const rent     = room.rent
    ? (String(room.rent).startsWith('₹') ? room.rent : `₹${room.rent}/mo`)
    : 'Price on request';
  const available = room.available !== undefined ? room.available : room.status === 'active';

  return (
    <AnimatedPress style={s.roomCard} onPress={onPress}>
      <View style={s.roomImgPlaceholder}>
        <Ionicons name="home-outline" size={36} color="rgba(255,255,255,0.4)" />
        {available && (
          <View style={s.availBadge}>
            <Text style={s.availTxt}>Available</Text>
          </View>
        )}
      </View>
      <View style={s.roomInfo}>
        <Text style={s.roomTitle} numberOfLines={1}>{title}</Text>
        <View style={s.roomMeta}>
          <View style={s.roomChip}>
            <Ionicons name="location-outline" size={11} color="#777" />
            <Text style={s.roomChipTxt}>{location}</Text>
          </View>
          <View style={s.roomChip}>
            <Text style={s.roomChipTxt}>{type}</Text>
          </View>
        </View>
        <Text style={s.roomRent}>{rent}</Text>
      </View>
    </AnimatedPress>
  );
}

// ── Recent Job Card (vertical list) ──────────────────────────────────────────
function RecentJobCard({ job, onPress, index = 0 }) {
  const iconName = CAT_ICONS[job.category || job.icon] || 'briefcase';
  const ageDays = (Date.now() - (job.timestamp || 0)) / 86400000;
  const freshnessColor = ageDays < 1 ? '#16a34a' : ageDays < 7 ? ORANGE : '#bbb';
  const freshnessLabel = ageDays < 1 ? 'Today'
    : ageDays < 7 ? `${Math.floor(ageDays)}d ago`
    : job.timestamp ? timeAgo(job.timestamp) : (job.jobTime || 'Recent');
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 2) : [];
  const expLabel = job.experience ? job.experience : job.fresher_ok ? 'Fresher OK' : null;

  return (
    <FadeSlide delay={200 + index * 110}>
      <AnimatedPress
        style={[s.jobCard, job.featured && s.jobCardFeatured, job.urgent && s.jobCardUrgent]}
        onPress={onPress}
      >
        {job.featured && (
          <View style={s.jobFeatBadge}>
            <Ionicons name="star" size={8} color="#fff" />
            <Text style={s.jobFeatTxt}>FEATURED</Text>
          </View>
        )}
        {job.urgent && !job.featured && (
          <View style={[s.jobFeatBadge, { backgroundColor: '#ef4444' }]}>
            <Ionicons name="flame" size={8} color="#fff" />
            <Text style={s.jobFeatTxt}>URGENT</Text>
          </View>
        )}
        <View style={s.jobRow}>
          <View style={s.jobThumb}><Ionicons name={iconName} size={20} color={ORANGE} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              {job.verified_employer && <Ionicons name="checkmark-circle" size={12} color="#16a34a" />}
            </View>
            <View style={s.jobSubRow}>
              <Ionicons name="business-outline" size={11} color="#aaa" />
              <Text style={s.jobSub} numberOfLines={1}> {job.company}</Text>
            </View>
            <View style={s.jobChipsRow}>
              <View style={s.jobLocChip}>
                <Ionicons name="location-outline" size={10} color="#777" />
                <Text style={s.jobLocTxt}>{job.location || job.loc}</Text>
              </View>
              {expLabel && <View style={s.jobExpChip}><Text style={s.jobExpTxt}>{expLabel}</Text></View>}
            </View>
            {skills.length > 0 && (
              <View style={s.jobSkillsRow}>
                {skills.map((sk, i) => <View key={i} style={s.jobSkillTag}><Text style={s.jobSkillTxt}>{sk}</Text></View>)}
              </View>
            )}
          </View>
          <View style={s.salaryCol}>
            <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
            <View style={[s.freshnessRow, { marginTop: 6 }]}>
              {ageDays < 1 ? <PulseDot color={freshnessColor} /> : <View style={[s.freshnessDot, { backgroundColor: freshnessColor }]} />}
              <Text style={[s.jobTime, { color: freshnessColor }]}>{freshnessLabel}</Text>
            </View>
            {(job.applicant_count > 0) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' }}>
                <Ionicons name="people" size={10} color={ORANGE} />
                <Text style={{ fontSize: 10, color: ORANGE, fontWeight: '700', marginLeft: 2 }}>{job.applicant_count}</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPress>
    </FadeSlide>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user } = useAuth();
  const { lang, changeLang } = useLang();
  const insets = useSafeAreaInsets();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ── Live data state ───────────────────────────────────────────────────────
  const [rooms,    setRooms]    = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats,    setStats]    = useState({ jobs: 842, rooms: 324, vehicles: 156, items: 580 });

  // ── Fetch rooms + vehicles from backend ───────────────────────────────────
  const fetchHomeData = useCallback(async () => {
    try {
      const [roomRes, vehicleRes] = await Promise.all([
        http('GET', '/api/rooms'),
        http('GET', '/api/vehicles'),
      ]);
      if (roomRes?.ok && Array.isArray(roomRes.rooms))       setRooms(roomRes.rooms);
      if (vehicleRes?.ok && Array.isArray(vehicleRes.vehicles)) setVehicles(vehicleRes.vehicles);

      // Update stats from live counts
      const liveJobs    = jobs?.filter(j => j.status === 'active').length || 0;
      const liveRooms   = roomRes?.rooms?.length    || 0;
      const liveVehicles= vehicleRes?.vehicles?.length || 0;
      setStats(prev => ({
        jobs:     liveJobs     > 0 ? liveJobs      : prev.jobs,
        rooms:    liveRooms    > 0 ? liveRooms      : prev.rooms,
        vehicles: liveVehicles > 0 ? liveVehicles   : prev.vehicles,
        items:    prev.items,
      }));
    } catch {}
  }, [jobs]);

  useEffect(() => { fetchHomeData(); }, []);

  // ── Derived display data ──────────────────────────────────────────────────
  const currentLang    = LANGUAGES.find(l => l.code === lang);
  const langBtnLabel   = currentLang?.native || 'EN';
  const activeJobs     = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs     = activeJobs
    .sort((a, b) =>
      ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
      ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
      b.timestamp - a.timestamp)
    .slice(0, 3);

  // ── Fallback demo data (shown only when database is empty) ────────────────
  const featuredDemoJobs = [
    { id: 'f1', title: 'Delivery Executive',  company: 'Swiggy Instamart',    salary: '₹15k–20k/mo', category: 'Delivery',   status: 'active', location: 'Nanded',               timestamp: Date.now() - 3600000 * 2 },
    { id: 'f2', title: 'Data Entry Operator', company: 'TechSoft Solutions',  salary: '₹10k–12k/mo', category: 'Data Entry', status: 'active', location: 'Nanded',               timestamp: Date.now() - 86400000, verified_employer: true },
    { id: 'f3', title: 'Security Guard',      company: 'Cybex Solution',      salary: '₹10,000/mo',  category: 'Security',   status: 'active', location: 'Kabra Nagar',          timestamp: Date.now() - 86400000 },
    { id: 'f4', title: 'Telecaller',          company: 'Dhanraj Enterprises', salary: '₹12,000/mo',  category: 'TeleCaller', status: 'active', location: 'Maharana Pratap Chowk',timestamp: Date.now() - 86400000 * 5, fresher_ok: true },
  ];

  const demoJobs = [
    { id: 'demo1', title: 'Telecaller',    company: 'Dhanraj Enterprises', location: 'Nanded',       salary: '₹12,000/mo', category: 'Other', icon: 'call-outline',       fresher_ok: true,  skills: ['Marathi', 'Hindi'],           jobTime: 'Full time' },
    { id: 'demo2', title: 'Web Developer', company: 'TechSoft Solutions',  location: 'Nanded',       salary: '₹25,000/mo', category: 'Other', icon: 'globe-outline',      experience: '1 yr exp', skills: ['React', 'Node.js'], verified_employer: true, jobTime: 'Full time' },
    { id: 'demo3', title: 'Shop Assistant',company: 'Reliance Retail',     location: 'Station Road', salary: '₹12,000/mo', category: 'Shop Assistant', icon: 'storefront-outline', fresher_ok: true, skills: ['Customer service', 'Billing'], jobTime: 'Full time' },
  ];

  const demoRooms = [
    { id: 'r1', title: '1BHK Flat – Vazirabad',       location: 'Vazirabad',    type: '1BHK',   rent: '₹5,500/mo',  available: true },
    { id: 'r2', title: 'Single Room – Station Road',  location: 'Station Road', type: 'Single', rent: '₹3,000/mo',  available: true },
    { id: 'r3', title: 'PG for Girls – Shivaji Nagar',location: 'Shivaji Nagar',type: 'PG',     rent: '₹4,200/mo',  available: true },
  ];

  const displayJobs     = recentJobs.length > 0  ? recentJobs           : demoJobs;
  const displayFeatured = activeJobs.length > 0  ? activeJobs.slice(0,4): featuredDemoJobs;
  const displayRooms    = rooms.length > 0        ? rooms.slice(0, 3)    : demoRooms;

  const handleSearch = () => { if (searchText.trim()) nav.navigate('Jobs'); };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Sticky White Header ── */}
      <View style={[s.headerBand, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brandText}>
              <Text style={s.brandNanded}>Nanded</Text>
              <Text style={s.brandRozgar}>Rozgar</Text>
            </Text>
            <View style={s.locRow}>
              <Ionicons name="location-sharp" size={12} color={ORANGE} />
              <Text style={s.locText}>Nanded, Maharashtra</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={s.langToggle} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
              <Ionicons name="language" size={12} color={ORANGE} />
              <Text style={s.langToggleTxt}>{langBtnLabel}</Text>
              <Ionicons name="chevron-down" size={10} color={ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('Profile')} activeOpacity={0.8} style={s.bellBtn}>
              <Ionicons name="notifications-outline" size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
              <Text style={s.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'T'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LangModal visible={showLangPicker} current={lang} onSelect={changeLang} onClose={() => setShowLangPicker(false)} />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ── */}
        <FadeSlide delay={0} fromY={-12}>
          <View style={s.heroBanner}>
            <View style={s.heroCircle1} />
            <View style={s.heroCircle2} />
            <Text style={s.heroTitle}>Find Jobs &{'\n'}Rooms in Nanded</Text>
            <Text style={s.heroSub}>10,000+ opportunities nearby</Text>
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color="#aaa" style={{ marginLeft: 12 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search jobs, rooms, cars..."
                placeholderTextColor="#aaa"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
                <Ionicons name="search" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </FadeSlide>

        {/* ── Stats Row — live from backend ── */}
        <FadeSlide delay={80}>
          <View style={s.statsRow}>
            <AnimatedStat value={stats.jobs}     label="Active Jobs" delay={300} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.rooms}    label="Rooms"       delay={450} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.vehicles} label="Vehicles"    delay={600} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.items}    label="Items"       delay={750} />
          </View>
        </FadeSlide>

        {/* ── Explore ── */}
        <FadeSlide delay={120}>
          <Text style={s.sectionTitleStandalone}>Explore</Text>
          <View style={s.exploreGrid}>
            <ExploreCard
              icon="briefcase-outline"
              title="Jobs"
              subtitle={`${stats.jobs}+ openings`}
              color={ORANGE}
              onPress={() => nav.navigate('Jobs')}
              style={{ marginRight: 8 }}
            />
            <ExploreCard
              icon="home-outline"
              title="Rooms"
              subtitle={`${stats.rooms}+ listings`}
              color={TEAL}
              onPress={() => nav.navigate('Rooms')}
            />
          </View>
          <View style={[s.exploreGrid, { marginTop: 10 }]}>
            <ExploreCard
              icon="car-sport-outline"
              title="Vehicles"
              subtitle={`${stats.vehicles}+ for rent`}
              color={PURPLE}
              onPress={() => nav.navigate('Cars')}
              style={{ marginRight: 8 }}
            />
            <ExploreCard
              icon="pricetag-outline"
              title="Buy & Sell"
              subtitle={`${stats.items}+ items`}
              color={ORANGE}
              onPress={() => nav.navigate('BuySell')}
            />
          </View>
        </FadeSlide>

        {/* ── Ticker — seamless, dark navy, entrance animation built-in ── */}
        <TickerBanner />

        {/* ── Featured Jobs (horizontal scroll) — live from backend ── */}
        <FadeSlide delay={200}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Featured Jobs</Text>
            <TouchableOpacity onPress={() => nav.navigate('Jobs')}>
              <Text style={s.seeAllBtn}>See all ›</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={displayFeatured}
            keyExtractor={j => String(j.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
            renderItem={({ item }) => (
              <FeaturedJobCard
                job={item}
                onPress={() => item.status === 'active' ? nav.navigate('JobDetail', { job: item }) : nav.navigate('Jobs')}
              />
            )}
          />
        </FadeSlide>

        {/* ── Recent Rooms — live from backend ── */}
        <FadeSlide delay={260}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Rooms</Text>
            <TouchableOpacity onPress={() => nav.navigate('Rooms')}>
              <Text style={s.seeAllBtn}>See all ›</Text>
            </TouchableOpacity>
          </View>
          {displayRooms.map(room => (
            <RecentRoomCard
              key={String(room.id)}
              room={room}
              onPress={() => nav.navigate('RoomDetail', { room })}
            />
          ))}
        </FadeSlide>

        {/* ── AI Career Assistant Banner ── */}
        <FadeSlide delay={300}>
          <TouchableOpacity style={s.aiCard} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.9}>
            <View style={s.aiLeft}>
              <View style={s.aiIconWrap}><Ionicons name="sparkles" size={22} color={ORANGE} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiTitle}>AI Career Assistant</Text>
                <Text style={s.aiPrompt}>"What salary should I ask for a driver in Nanded?"</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ORANGE} />
          </TouchableOpacity>
        </FadeSlide>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  headerBand: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  headerTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandText:       { fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  brandNanded:     { color: '#111111' },
  brandRozgar:     { color: ORANGE },
  locRow:          { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText:         { color: '#888', fontSize: 11, fontWeight: '500' },
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  profileInitial:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
  },
  langToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: ORANGE,
  },
  langToggleTxt: { color: ORANGE, fontSize: 11, fontWeight: '700' },

  // Hero
  heroBanner: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28,
    overflow: 'hidden', position: 'relative',
  },
  heroCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50,
  },
  heroCircle2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: -40, right: 60,
  },
  heroTitle:  { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34, marginBottom: 6 },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginBottom: 18, fontWeight: '500' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, height: 48, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: '#333' },
  searchBtn:   { width: 46, height: 48, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 17, fontWeight: '900', color: '#111' },
  statLabel:   { fontSize: 9, color: '#888', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 26, backgroundColor: '#eee' },

  // Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  sectionTitle:           { fontSize: 17, fontWeight: '800', color: '#111' },
  sectionTitleStandalone: { fontSize: 17, fontWeight: '800', color: '#111', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  seeAllBtn:              { fontSize: 13, fontWeight: '700', color: ORANGE },

  // Explore Grid
  exploreGrid: { flexDirection: 'row', paddingHorizontal: 16 },
  exploreCard: {
    flex: 1, borderRadius: 16, padding: 16, minHeight: 130,
    overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  exploreInner:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  exploreIconWrap:{
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  exploreBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  exploreTitle:   { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  exploreSub:     { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  exploreCircle1: { position: 'absolute', width: 90, height: 90, borderRadius: 45, bottom: -20, right: -20 },
  exploreCircle2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, bottom: 20, right: 40 },

  // ── Ticker — dark navy background, centered one-by-one animation ──────
  ticker: {
    backgroundColor: '#1a1a2e',
    height: 38,
    overflow: 'hidden',
    marginTop: 12,
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tickerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Featured Jobs (horizontal)
  featJobCard: {
    width: 210, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  featJobTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featJobIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  featJobTitle:   { fontSize: 13, fontWeight: '700', color: '#111' },
  featJobCompany: { fontSize: 11, color: '#aaa', marginTop: 2 },
  featJobBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  featJobSalary:  { fontSize: 13, fontWeight: '800', color: ORANGE, flex: 1, flexWrap: 'wrap' },
  applyBtn:       { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, alignItems: 'center', flexShrink: 0 },
  applyBtnTxt:    { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Room Cards
  roomCard: {
    backgroundColor: '#fff', borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  roomImgPlaceholder: {
    height: 130, backgroundColor: '#2d2d3e',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  availBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#16a34a', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  availTxt:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  roomInfo:    { padding: 14 },
  roomTitle:   { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  roomMeta:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roomChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  roomChipTxt: { fontSize: 11, color: '#666', fontWeight: '500' },
  roomRent:    { fontSize: 16, fontWeight: '800', color: '#111' },

  // AI Card
  aiCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE,
    padding: 14, marginHorizontal: 16, marginVertical: 8,
    shadowColor: ORANGE, shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  aiLeft:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiIconWrap: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  aiTitle:    { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 3 },
  aiPrompt:   { fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 16 },

  // Job Cards
  jobCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb',
    marginHorizontal: 16, marginBottom: 10, padding: 14, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  jobCardFeatured: { borderLeftWidth: 3, borderLeftColor: ORANGE },
  jobCardUrgent:   { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  jobFeatBadge: {
    position: 'absolute', top: 0, right: 12,
    backgroundColor: ORANGE, borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    paddingVertical: 2, paddingHorizontal: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3, zIndex: 10,
  },
  jobFeatTxt:   { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  jobRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobThumb:     { width: 44, height: 44, borderRadius: 11, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  jobTitle:     { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  jobSubRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobSub:       { fontSize: 11, color: '#777' },
  jobChipsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  jobLocChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  jobLocTxt:    { fontSize: 10, color: '#666', fontWeight: '500' },
  jobExpChip:   { backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#bbf7d0' },
  jobExpTxt:    { fontSize: 10, color: '#15803d', fontWeight: '600' },
  jobSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  jobSkillTag:  { backgroundColor: '#f8f8f8', borderWidth: 0.5, borderColor: '#e5e5e5', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  jobSkillTxt:  { fontSize: 9, color: '#666', fontWeight: '500' },
  salaryCol:    { alignItems: 'flex-end', flexShrink: 0 },
  priceBadge:   { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  freshnessDot: { width: 5, height: 5, borderRadius: 3 },
  jobTime:      { fontSize: 10, color: '#bbb', fontWeight: '500' },

  viewAll:    { marginHorizontal: 16, marginTop: 4, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});

const lm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  title:        { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 16 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: 'transparent' },
  rowActive:    { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  native:       { fontSize: 17, fontWeight: '700', color: '#111', minWidth: 60 },
  nativeActive: { color: ORANGE },
  label:        { fontSize: 13, color: '#888', fontWeight: '500' },
});
