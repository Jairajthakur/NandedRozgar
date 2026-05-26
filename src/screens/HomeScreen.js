import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, TextInput, Modal,
  FlatList, Dimensions, Platform, useWindowDimensions,
} from 'react-native';

// ScrollVelocity is a web-only component (uses DOM/motion)
let ScrollVelocity = null;
if (Platform.OS === 'web') {
  try {
    ScrollVelocity = require('../components/ScrollVelocity').default;
  } catch (e) {
    // fallback gracefully if motion not installed
  }
}
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { C, CAT_ICONS } from '../utils/constants';
import { useLang, LANGUAGES } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';
import { timeAgo, http } from '../utils/api';

const ORANGE    = '#f97316';
const TEAL      = '#0d9488';
const PURPLE    = '#7c3aed';
const TICKER_BG = '#1a1a2e';
const IS_WEB    = Platform.OS === 'web';
// ── Custom scrollbar (web only) ────────────────────────────────────────────────



// Responsive breakpoints
const BP_SM  = 600;   // mobile-web: single column, no sidebar
const BP_MD  = 900;   // tablet: sidebar + main, no right panel
const BP_LG  = 1100;  // desktop: full 3-column layout

const { width: SCREEN_W } = Dimensions.get('window');

// ── Animated Pressable ─────────────────────────────────────────────────────────
function AnimatedPress({ style, onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
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

// ── FadeSlide ──────────────────────────────────────────────────────────────────
function FadeSlide({ children, delay = 0, fromY = 24, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 480, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>
  );
}

// ── Pulsing dot ────────────────────────────────────────────────────────────────
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

// ── Animated stat counter ──────────────────────────────────────────────────────
function AnimatedStat({ value, label, delay = 0, accent = ORANGE }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: value, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, delay);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => { clearTimeout(timer); anim.removeListener(id); };
  }, [value]);

  if (IS_WEB) {
    return (
      <View style={ws.statCard}>
        <Text style={[ws.statNum, { color: accent }]}>{display}+</Text>
        <Text style={ws.statLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={s.statItem}>
      <Text style={s.statNum}>{display}+</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Lang Modal ─────────────────────────────────────────────────────────────────
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
        <Animated.View style={[lm.sheet, IS_WEB && lm.sheetWeb, { transform: [{ translateY: IS_WEB ? 0 : slideY }] }]}>
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

// ── Ticker ─────────────────────────────────────────────────────────────────────
function getTickerItems(t, districtLocalName) {
  const d = districtLocalName || '';
  return [
    { icon: 'checkmark-circle',   text: t('tickerHiring').replace('{DISTRICT}', d) },
    { icon: 'bicycle-outline',    text: t('tickerDelivery') },
    { icon: 'home-outline',       text: t('tickerRooms').replace('{DISTRICT}', d) },
    { icon: 'car-outline',        text: t('tickerCars') },
    { icon: 'cube-outline',       text: t('tickerBuySell') },
    { icon: 'call-outline',       text: 'TELECALLER JOBS — APPLY NOW' },
    { icon: 'shield-outline',     text: 'SECURITY GUARD VACANCIES' },
    { icon: 'construct-outline',  text: 'CONSTRUCTION WORK AVAILABLE' },
    { icon: 'briefcase-outline',  text: 'DATA ENTRY & OFFICE JOBS' },
    { icon: 'storefront-outline', text: t('tickerBuySell') },
  ];
}

// Scrolling text rows for ScrollVelocity (web)
const SCROLL_ROW_2 = '✦ SECURITY GUARD VACANCIES  ✦ CONSTRUCTION WORK  ✦ DATA ENTRY & OFFICE JOBS  ✦ LOCAL MARKETPLACE — NANDED  ✦ FRESHER JOBS AVAILABLE  ✦ POST FREE ADS TODAY';

// Web ScrollVelocity banner
function WebScrollBanner({ itemCount = 0 }) {
  const itemLabel = itemCount > 0 ? `${itemCount}+` : 'MANY';
  const SCROLL_ROW_1 = `✦ HIRING NOW — Nanded  ✦ DELIVERY JOBS AVAILABLE  ✦ ROOMS FOR RENT  ✦ CARS & VEHICLES FOR HIRE  ✦ BUY & SELL ${itemLabel} ITEMS  ✦ TELECALLER JOBS — APPLY NOW`;
  if (!ScrollVelocity) return null;
  return (
    <div style={{
      backgroundColor: '#f8f5f0',
      overflow: 'hidden',
      paddingTop: 12,
      paddingBottom: 12,
      marginBottom: 20,
      borderRadius: 12,
      border: '1.5px solid #ede8e0',
    }}>
      <ScrollVelocity
        texts={[SCROLL_ROW_1, SCROLL_ROW_2]}
        velocity={80}
        className="cityplus-ticker-span"
        parallaxStyle={{ overflow: 'hidden' }}
        scrollerStyle={{ color: '#1a1a1a', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.07em', paddingTop: 4, paddingBottom: 4 }}
      />
    </div>
  );
}


// Native animated ticker (mobile / fallback)
// ── Ticker ─────────────────────────────────────────────────────────────────────
const ITEM_H = 38; // must match s.ticker height

function TickerBanner({ t, districtLocalName, itemCount = 0 }) {
  if (IS_WEB) return <WebScrollBanner itemCount={itemCount} />;

  const TICKER_ITEMS = getTickerItems(t, districtLocalName);
  const DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS]; // seamless loop
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const totalHeight = ITEM_H * TICKER_ITEMS.length;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -totalHeight,
          duration: TICKER_ITEMS.length * 1800, // 1.8s per item
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0, // instant reset — invisible because we use doubled array
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[s.ticker, { overflow: 'hidden' }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {DOUBLED.map((item, idx) => (
          <View key={idx} style={[s.tickerRow, { height: ITEM_H, justifyContent: 'center' }]}>
            <Ionicons name={item.icon} size={14} color={ORANGE} style={{ marginRight: 8 }} />
            <Text style={s.tickerText} numberOfLines={1}>{item.text}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ── Web Sidebar Nav Item ───────────────────────────────────────────────────────
function SideNavItem({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity style={[ws.sideNavItem, active && ws.sideNavItemActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={active ? ORANGE : '#666'} />
      <Text style={[ws.sideNavLabel, active && ws.sideNavLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Explore Card ───────────────────────────────────────────────────────────────
function ExploreCard({ icon, title, subtitle, color, onPress, style, compact }) {
  return (
    <AnimatedPress style={[s.exploreCard, IS_WEB && ws.exploreCard, IS_WEB && compact && ws.exploreCardSm, { backgroundColor: color }, style]} onPress={onPress}>
      <View style={s.exploreInner}>
        <View style={s.exploreIconWrap}>
          <Ionicons name={icon} size={compact ? 22 : IS_WEB ? 28 : 26} color="#fff" />
        </View>
        <View style={s.exploreBadge}>
          <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.8)" />
        </View>
      </View>
      <Text style={[s.exploreTitle, IS_WEB && ws.exploreTitle, IS_WEB && compact && ws.exploreTitleSm]}>{title}</Text>
      <Text style={[s.exploreSub, compact && { fontSize: 11 }]}>{subtitle}</Text>
      <View style={[s.exploreCircle1, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
      <View style={[s.exploreCircle2, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
    </AnimatedPress>
  );
}

// ── Featured Job Card ──────────────────────────────────────────────────────────
function FeaturedJobCard({ job, onPress, cardWidth }) {
  const { t, lang } = useLang();
  const baseStyle = IS_WEB ? ws.featJobCard : s.featJobCard;
  const widthStyle = cardWidth ? { width: cardWidth } : {};
  return (
    <AnimatedPress style={[baseStyle, widthStyle]} onPress={onPress}>
      <View style={s.featJobTop}>
        <View style={s.featJobIcon}>
          <Ionicons name={CAT_ICONS[job.category] || 'briefcase-outline'} size={18} color={ORANGE} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AutoTranslate text={job.title} lang={lang} style={s.featJobTitle} numberOfLines={1} />
          <AutoTranslate text={job.company} lang={lang} style={s.featJobCompany} numberOfLines={1} />
        </View>
      </View>
      <View style={s.featJobBottom}>
        <Text style={s.featJobSalary} numberOfLines={1}>{job.salary}</Text>
        <TouchableOpacity style={s.applyBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={s.applyBtnTxt}>{t('applyBtn')}</Text>
        </TouchableOpacity>
      </View>
    </AnimatedPress>
  );
}

// ── Recent Room Card ───────────────────────────────────────────────────────────
function RecentRoomCard({ room, onPress }) {
  const { t, lang } = useLang();
  const title    = room.title    || (room.bhk_size ? `${room.bhk_size} – ${room.area}` : room.area || 'Room');
  const location = room.location || room.area || 'Nanded';
  const type     = room.type     || room.room_type || room.bhk_size || 'Room';
  const rent     = room.rent
    ? (String(room.rent).startsWith('₹') ? room.rent : `₹${room.rent}/mo`)
    : t('priceOnRequest');
  const available = room.available !== undefined ? room.available : room.status === 'active';

  return (
    <AnimatedPress style={[s.roomCard, IS_WEB && ws.roomCard]} onPress={onPress}>
      <View style={[s.roomImgPlaceholder, IS_WEB && ws.roomImgPlaceholder]}>
        <Ionicons name="home-outline" size={IS_WEB ? 44 : 36} color="rgba(255,255,255,0.4)" />
        {available && (
          <View style={s.availBadge}>
            <Text style={s.availTxt}>{t('availableBadge')}</Text>
          </View>
        )}
      </View>
      <View style={s.roomInfo}>
        <AutoTranslate text={title} lang={lang} style={[s.roomTitle, IS_WEB && { fontSize: 15 }]} numberOfLines={1} />
        <View style={s.roomMeta}>
          <View style={s.roomChip}>
            <Ionicons name="location-outline" size={11} color="#777" />
            <Text style={s.roomChipTxt}>{location}</Text>
          </View>
          <View style={s.roomChip}>
            <AutoTranslate text={type} lang={lang} style={s.roomChipTxt} />
          </View>
        </View>
        <Text style={[s.roomRent, IS_WEB && { fontSize: 17 }]}>{rent}</Text>
      </View>
    </AnimatedPress>
  );
}

// ── Recent Job Card ────────────────────────────────────────────────────────────
function RecentJobCard({ job, onPress, index = 0 }) {
  const { t, lang } = useLang();
  const iconName = CAT_ICONS[job.category || job.icon] || 'briefcase';
  const ageDays = (Date.now() - (job.timestamp || 0)) / 86400000;
  const freshnessColor = ageDays < 1 ? '#16a34a' : ageDays < 7 ? ORANGE : '#bbb';
  const freshnessLabel = ageDays < 1 ? t('todayLabel')
    : ageDays < 7 ? `${Math.floor(ageDays)}d ago`
    : job.timestamp ? timeAgo(job.timestamp) : (job.jobTime || t('recentLabel'));
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 3) : [];
  const expLabel = job.experience ? job.experience : job.fresher_ok ? t('fresherOK') : null;

  return (
    <FadeSlide delay={200 + index * 90}>
      <AnimatedPress
        style={[s.jobCard, IS_WEB && ws.jobCard, job.featured && s.jobCardFeatured, job.urgent && s.jobCardUrgent]}
        onPress={onPress}
      >
        {job.featured && (
          <View style={s.jobFeatBadge}>
            <Ionicons name="star" size={8} color="#fff" />
            <Text style={s.jobFeatTxt}>{t('featuredBadge')}</Text>
          </View>
        )}
        {job.urgent && !job.featured && (
          <View style={[s.jobFeatBadge, { backgroundColor: '#ef4444' }]}>
            <Ionicons name="flame" size={8} color="#fff" />
            <Text style={s.jobFeatTxt}>{t('urgentBadge')}</Text>
          </View>
        )}
        <View style={s.jobRow}>
          <View style={[s.jobThumb, IS_WEB && ws.jobThumb]}>
            <Ionicons name={iconName} size={IS_WEB ? 24 : 20} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <AutoTranslate text={job.title} lang={lang} style={[s.jobTitle, IS_WEB && ws.jobTitle]} numberOfLines={1} />
              {job.verified_employer && <Ionicons name="checkmark-circle" size={14} color="#16a34a" />}
            </View>
            <View style={s.jobSubRow}>
              <Ionicons name="business-outline" size={11} color="#aaa" />
              <AutoTranslate text={job.company} lang={lang} style={s.jobSub} numberOfLines={1} />
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
            <View style={s.priceBadge}><Text style={[s.priceTxt, IS_WEB && { fontSize: 13 }]}>{job.salary}</Text></View>
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

// ── Web Quick-Action Button ────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={[ws.quickAction, { borderColor: color + '33' }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[ws.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={ws.quickActionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user } = useAuth();
  const { lang, changeLang, t, tDistrict } = useLang();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { currentDistrict, selectDistrict, DISTRICTS } = useDistrict();

  // Localised district name — Marathi/Hindi script when those langs are active
  const districtLocalName = currentDistrict
    ? (lang === 'mr' ? (currentDistrict.nameMarathi || currentDistrict.name)
     : lang === 'hi' ? (currentDistrict.nameHindi   || currentDistrict.name)
     : currentDistrict.name)
    : 'Nanded';

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [searchText, setSearchText]         = useState('');

  // Responsive breakpoints (web only)
  const showSidebar    = IS_WEB && winW >= BP_MD;
  const showRightPanel = IS_WEB && winW >= BP_LG;
  const isSmWeb        = IS_WEB && winW < BP_SM;

  const [rooms,    setRooms]    = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats,    setStats]    = useState({ jobs: 0, rooms: 0, vehicles: 0, items: 0 });

  const { loadJobs } = useAuth();

  const fetchHomeData = useCallback(async () => {
    try {
      const districtParam = currentDistrict?.id ? `?district=${currentDistrict.id}` : '';
      const [roomRes, vehicleRes, buysellCountRes] = await Promise.all([
        http('GET', `/api/rooms${districtParam}`),
        http('GET', `/api/vehicles${districtParam}`),
        http('GET', `/api/buysell/count${districtParam}`),
      ]);
      if (roomRes?.ok && Array.isArray(roomRes.rooms))           setRooms(roomRes.rooms);
      if (vehicleRes?.ok && Array.isArray(vehicleRes.vehicles)) setVehicles(vehicleRes.vehicles);
      const liveJobs     = jobs?.filter(j => j.status === 'active').length || 0;
      const liveRooms    = roomRes?.rooms?.length    || 0;
      const liveVehicles = vehicleRes?.vehicles?.length || 0;
      const liveItems    = buysellCountRes?.ok ? (buysellCountRes.count ?? 0) : 0;
      setStats(prev => ({
        jobs:     liveJobs     > 0 ? liveJobs     : prev.jobs,
        rooms:    liveRooms    > 0 ? liveRooms    : prev.rooms,
        vehicles: liveVehicles > 0 ? liveVehicles : prev.vehicles,
        items:    liveItems    >= 0 ? liveItems    : prev.items,
      }));
    } catch {}
  }, [jobs, currentDistrict]);

  // Reload jobs & home data whenever district changes
  useEffect(() => {
    if (currentDistrict?.id) {
      loadJobs(1, null, null, currentDistrict.id);
    }
    fetchHomeData();
  }, [currentDistrict?.id]);

  const currentLang  = LANGUAGES.find(l => l.code === lang);
  const langBtnLabel = currentLang?.native || 'EN';
  const activeJobs   = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs   = activeJobs
    .sort((a, b) =>
      ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
      ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
      b.timestamp - a.timestamp)
    .slice(0, 6);

  const featuredDemoJobs = [
    { id: 'f1', title: t('demoJob1Title'), company: 'Swiggy Instamart',    salary: '₹15k–20k/mo', category: 'Delivery',   status: 'active', location: 'Nanded',               timestamp: Date.now() - 3600000 * 2 },
    { id: 'f2', title: t('demoJob2Title'), company: 'TechSoft Solutions',  salary: '₹10k–12k/mo', category: 'Data Entry', status: 'active', location: 'Nanded',               timestamp: Date.now() - 86400000, verified_employer: true },
    { id: 'f3', title: t('demoJob3Title'), company: 'Cybex Solution',      salary: '₹10,000/mo',  category: 'Security',   status: 'active', location: 'Kabra Nagar',          timestamp: Date.now() - 86400000 },
    { id: 'f4', title: t('demoJob4Title'), company: 'Dhanraj Enterprises', salary: '₹12,000/mo',  category: 'TeleCaller', status: 'active', location: 'Maharana Pratap Chowk',timestamp: Date.now() - 86400000 * 5, fresher_ok: true },
  ];
  const demoJobs = [
    { id: 'demo1', title: t('demoJob4Title'), company: 'Dhanraj Enterprises', location: 'Nanded',       salary: '₹12,000/mo', category: 'Other', icon: 'call-outline',       fresher_ok: true,   skills: ['Marathi', 'Hindi'],           jobTime: t('fullTime') },
    { id: 'demo2', title: t('demoJob5Title'), company: 'TechSoft Solutions',  location: 'Nanded',       salary: '₹25,000/mo', category: 'Other', icon: 'globe-outline',      experience: '1 yr', skills: ['React', 'Node.js'], verified_employer: true, jobTime: t('fullTime') },
    { id: 'demo3', title: t('demoJob6Title'), company: 'Reliance Retail',     location: 'Station Road', salary: '₹12,000/mo', category: 'Shop Assistant', icon: 'storefront-outline', fresher_ok: true, skills: ['Customer service', 'Billing'], jobTime: t('fullTime') },
  ];
  const demoRooms = [
    { id: 'r1', title: t('demoRoom1Title'), location: 'Vazirabad',     type: t('demoRoom1Type'), rent: '₹5,500/mo',  available: true },
    { id: 'r2', title: t('demoRoom2Title'), location: 'Station Road',  type: t('demoRoom2Type'), rent: '₹3,000/mo',  available: true },
    { id: 'r3', title: t('demoRoom3Title'), location: 'Shivaji Nagar', type: t('demoRoom3Type'), rent: '₹4,200/mo',  available: true },
  ];

  const displayJobs     = recentJobs.length > 0  ? recentJobs            : demoJobs;
  const displayFeatured = activeJobs.length > 0  ? activeJobs.slice(0,4) : featuredDemoJobs;
  const displayRooms    = rooms.length > 0        ? rooms.slice(0, 3)     : demoRooms;

  const handleSearch = () => {
    const q = searchText.trim().toLowerCase();
    if (!q) return;
    const roomKw = ['room', 'rooms', 'flat', 'pg', 'hostel', 'rent', 'bhk', 'house', 'accommodation', '1bhk', '2bhk'];
    const carKw  = ['car', 'cars', 'vehicle', 'vehicles', 'bike', 'scooter', 'auto', 'truck', 'cab'];
    const sellKw = ['buy', 'sell', 'item', 'items', 'product', 'second hand', 'used', 'electronics', 'furniture', 'mobile'];
    if (roomKw.some(k => q.includes(k)))      nav.navigate('Rooms',   { searchQuery: searchText.trim() });
    else if (carKw.some(k => q.includes(k)))  nav.navigate('Cars',    { searchQuery: searchText.trim() });
    else if (sellKw.some(k => q.includes(k))) nav.navigate('BuySell', { searchQuery: searchText.trim() });
    else                                      nav.navigate('Jobs',    { searchQuery: searchText.trim() });
  };

  // ── WEB LAYOUT ─────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <>
      <View style={ws.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* ── Top Nav Bar ── */}
        <View style={ws.topNav}>
          {isSmWeb ? (
            /* ── Mobile web: 2-row header ── */
            <View style={ws.topNavSm}>
              {/* Row 1: Brand + icons */}
              <View style={ws.topNavSmRow1}>
                <TouchableOpacity onPress={() => setShowDistrictPicker(true)} activeOpacity={0.8}>
                  <Text style={ws.brandText}>
                    <Text style={ws.brandCity}>City</Text>
                    <Text style={ws.brandRozgar}>Plus</Text>
                  </Text>
                  <View style={ws.locRow}>
                    <Ionicons name="location-sharp" size={11} color={ORANGE} />
                    <Text style={ws.locText}>{districtLocalName || 'Select District'}, Maharashtra</Text>
                    <Ionicons name="chevron-down" size={10} color={ORANGE} style={{ marginLeft: 2 }} />
                  </View>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity style={ws.langBtn} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
                    <Ionicons name="language" size={13} color={ORANGE} />
                    <Text style={ws.langBtnTxt}>{langBtnLabel}</Text>
                    <Ionicons name="chevron-down" size={11} color={ORANGE} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowDistrictPicker(true)}
                    activeOpacity={0.8}
                    style={[ws.bellBtn, { backgroundColor: (currentDistrict?.color || ORANGE) + '15', borderWidth: 1, borderColor: (currentDistrict?.color || ORANGE) + '40' }]}
                  >
                    <Ionicons name="location-sharp" size={16} color={currentDistrict?.color || ORANGE} />
                  </TouchableOpacity>
                  <TouchableOpacity style={ws.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
                    <Text style={ws.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'T'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Search bar moved into hero banner for small web */}
            </View>
          ) : (
            /* ── Desktop web: single row ── */
            <View style={ws.topNavInner}>
              <TouchableOpacity style={ws.brandRow} onPress={() => setShowDistrictPicker(true)} activeOpacity={0.8}>
                <Text style={ws.brandText}>
                  <Text style={ws.brandCity}>City</Text>
                  <Text style={ws.brandRozgar}>Plus</Text>
                </Text>
                <View style={ws.locRow}>
                  <Ionicons name="location-sharp" size={12} color={ORANGE} />
                  <Text style={ws.locText}>{districtLocalName || 'Select District'}, Maharashtra</Text>
                  <Ionicons name="chevron-down" size={11} color={ORANGE} style={{ marginLeft: 2 }} />
                </View>
              </TouchableOpacity>
              <View style={ws.topSearchWrap}>
                <Ionicons name="search" size={16} color="#aaa" style={{ marginLeft: 14 }} />
                <TextInput
                  style={ws.topSearchInput}
                  placeholder={t('homeSearchPlaceholderWeb')}
                  placeholderTextColor="#bbb"
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity style={ws.topSearchBtn} onPress={handleSearch} activeOpacity={0.9}>
                  <Text style={ws.topSearchBtnTxt}>{t('homeSearchBtn')}</Text>
                </TouchableOpacity>
              </View>
              <View style={ws.topNavRight}>
                <TouchableOpacity style={ws.langBtn} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
                  <Ionicons name="language" size={13} color={ORANGE} />
                  <Text style={ws.langBtnTxt}>{langBtnLabel}</Text>
                  <Ionicons name="chevron-down" size={11} color={ORANGE} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDistrictPicker(true)}
                  activeOpacity={0.8}
                  style={[ws.bellBtn, { backgroundColor: (currentDistrict?.color || ORANGE) + '15', borderWidth: 1, borderColor: (currentDistrict?.color || ORANGE) + '40' }]}
                >
                  <Ionicons name="location-sharp" size={16} color={currentDistrict?.color || ORANGE} />
                </TouchableOpacity>
                <TouchableOpacity style={ws.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
                  <Text style={ws.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'T'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <LangModal visible={showLangPicker} current={lang} onSelect={changeLang} onClose={() => setShowLangPicker(false)} />

        {/* ── Body: Sidebar + Main + Right Panel ── */}
        <View style={ws.body}>

          {/* ── Left Sidebar (hidden on small/medium screens) ── */}
          {showSidebar && <View style={ws.sidebar}>
            <Text style={ws.sideNavSection}>{t('sideNavBrowse')}</Text>
            <SideNavItem icon="home-outline"        label={t('sideNavHome')}      onPress={() => {}} active />
            <SideNavItem icon="briefcase-outline"   label={t('sideNavJobs')}      onPress={() => nav.navigate('Jobs')} />
            <SideNavItem icon="home-outline"        label={t('sideNavRooms')}     onPress={() => nav.navigate('Rooms')} />
            <SideNavItem icon="car-sport-outline"   label={t('sideNavVehicles')}  onPress={() => nav.navigate('Cars')} />
            <SideNavItem icon="pricetag-outline"    label={t('sideNavBuySell')}   onPress={() => nav.navigate('BuySell')} />

            <Text style={[ws.sideNavSection, { marginTop: 20 }]}>{t('sideNavAccount')}</Text>
            <SideNavItem icon="add-circle-outline"  label={t('sideNavPostAd')}    onPress={() => nav.navigate('Post')} />
            <SideNavItem icon="person-outline"      label={t('sideNavMyProfile')} onPress={() => nav.navigate('Profile')} />
            <SideNavItem icon="sparkles-outline"    label={t('sideNavAI')}        onPress={() => nav.navigate('AIMatch')} />

            {/* Sidebar promo */}
            <View style={ws.sidePromo}>
              <Ionicons name="sparkles" size={20} color={ORANGE} />
              <Text style={ws.sidePromoTitle}>{t('sidePromoTitle')}</Text>
              <Text style={ws.sidePromoSub}>{t('sidePromoSub')}</Text>
              <TouchableOpacity style={ws.sidePromoCta} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.85}>
                <Text style={ws.sidePromoCtaTxt}>{t('sidePromoTryNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>}

          {/* ── Main Content ── */}
          <ScrollView
            style={[ws.main, { paddingHorizontal: isSmWeb ? 10 : 16, paddingTop: isSmWeb ? 8 : 10 }]}
            contentContainerStyle={{ paddingBottom: isSmWeb ? 80 : 48 }}
            showsVerticalScrollIndicator={true}
          >

            {/* ── Hero Banner ── */}
            <FadeSlide delay={0} fromY={-16}>
              {isSmWeb ? (
                /* ── Compact hero for mobile web — title + subtitle + search inside ── */
                <View style={ws.heroBannerCompact}>
                  <View style={ws.heroCircle1} />
                  <View style={ws.heroCircle2} />
                  <Text style={ws.heroBannerCompactTitle}>
                    {t('heroTitleWeb').split('{DISTRICT}')[0]}<Text style={{ color: '#ffd580' }}>{districtLocalName}</Text>{t('heroTitleWeb').split('{DISTRICT}')[1] || ''}
                  </Text>
                  <Text style={ws.heroBannerCompactSub}>{t('heroSubWeb')}</Text>
                  <View style={ws.heroBannerCompactSearch}>
                    <Ionicons name="search" size={16} color="#aaa" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={ws.heroBannerSearchInput}
                      placeholder={t('homeSearchPlaceholder')}
                      placeholderTextColor="#bbb"
                      value={searchText}
                      onChangeText={setSearchText}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                    <TouchableOpacity style={ws.heroBannerSearchBtn} onPress={handleSearch} activeOpacity={0.9}>
                      <Ionicons name="search" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ── Full hero for desktop web ── */
                <View style={ws.heroBanner}>
                  <View style={ws.heroCircle1} />
                  <View style={ws.heroCircle2} />
                  <View style={ws.heroCircle3} />
                  <View style={ws.heroContent}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.85)" />
                        <Text style={ws.heroTag}>{t('heroCityTag').replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^🏙️\s*/, '')}</Text>
                      </View>
                      <Text style={ws.heroTitle}>
                        {t('heroTitleWeb').split('{DISTRICT}')[0]}<Text style={{ color: '#ffd580' }}>{districtLocalName}</Text>{t('heroTitleWeb').split('{DISTRICT}')[1] || ''}
                      </Text>
                      <Text style={ws.heroSub}>{t('heroSubWeb')}</Text>
                      <View style={ws.heroBadges}>
                        <View style={ws.heroBadge}><Text style={ws.heroBadgeTxt}>{t('heroBadgeFree')}</Text></View>
                        <View style={ws.heroBadge}><Text style={ws.heroBadgeTxt}>{t('heroBadgeLocal')}</Text></View>
                        <View style={ws.heroBadge}><Text style={ws.heroBadgeTxt}>{t('heroBadgeVerified')}</Text></View>
                      </View>
                    </View>
                    <View style={ws.heroStats}>
                      <View style={ws.heroStatCard}>
                        <Text style={ws.heroStatNum}>{stats.jobs}+</Text>
                        <Text style={ws.heroStatLabel}>{t('statActiveJobs')}</Text>
                      </View>
                      <View style={ws.heroStatCard}>
                        <Text style={ws.heroStatNum}>{stats.rooms}+</Text>
                        <Text style={ws.heroStatLabel}>{t('statRooms')}</Text>
                      </View>
                      <View style={ws.heroStatCard}>
                        <Text style={ws.heroStatNum}>{stats.vehicles}+</Text>
                        <Text style={ws.heroStatLabel}>{t('statVehicles')}</Text>
                      </View>
                      <View style={ws.heroStatCard}>
                        <Text style={ws.heroStatNum}>{stats.items}+</Text>
                        <Text style={ws.heroStatLabel}>{t('statItems')}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </FadeSlide>

            {/* ── Ticker ── */}
            <TickerBanner t={t} districtLocalName={districtLocalName} itemCount={stats.items} />

            {/* ── Explore Grid ── */}
            <FadeSlide delay={100}>
              <View style={ws.sectionHeader}>
                <Text style={[ws.sectionTitle, isSmWeb && ws.sectionTitleSm]}>{t('exploreCategories')}</Text>
              </View>
              <View style={[ws.exploreGrid, isSmWeb && { flexWrap: 'wrap', gap: 8 }]}>
                <ExploreCard icon="briefcase-outline"  title={t('sideNavJobs')}     subtitle={`${stats.jobs}+ ${t('jobsOpenings')}`}      color={ORANGE}  onPress={() => nav.navigate('Jobs')}    compact={isSmWeb} style={[{ flex: 1, marginRight: 10 }, isSmWeb && { minWidth: '46%', marginRight: 0 }]} />
                <ExploreCard icon="home-outline"       title={t('sideNavRooms')}    subtitle={`${stats.rooms}+ ${t('roomsListings')}`}     color={TEAL}    onPress={() => nav.navigate('Rooms')}   compact={isSmWeb} style={[{ flex: 1, marginRight: 10 }, isSmWeb && { minWidth: '46%', marginRight: 0 }]} />
                <ExploreCard icon="car-sport-outline"  title={t('sideNavVehicles')} subtitle={`${stats.vehicles}+ ${t('vehiclesForRent')}`} color={PURPLE}  onPress={() => nav.navigate('Cars')}    compact={isSmWeb} style={[{ flex: 1, marginRight: 10 }, isSmWeb && { minWidth: '46%', marginRight: 0 }]} />
                <ExploreCard icon="pricetag-outline"   title={t('sideNavBuySell')}  subtitle={`${stats.items}+ ${t('itemsCount')}`}        color='#0ea5e9' onPress={() => nav.navigate('BuySell')} compact={isSmWeb} style={[{ flex: 1 }, isSmWeb && { minWidth: '46%' }]} />
              </View>
            </FadeSlide>

            {/* ── Recent Jobs ── */}
            <FadeSlide delay={160}>
              <View style={ws.sectionHeader}>
                <Text style={[ws.sectionTitle, isSmWeb && ws.sectionTitleSm]}>{t('recentJobsSection')}</Text>
                <TouchableOpacity onPress={() => nav.navigate('Jobs')} style={ws.seeAllBtn}>
                  <Text style={ws.seeAllTxt}>{t('viewAll')}</Text>
                  <Ionicons name="arrow-forward" size={14} color={ORANGE} />
                </TouchableOpacity>
              </View>
              {isSmWeb ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={ws.jobsScrollContent}
                  style={ws.jobsScroll}
                >
                  {displayJobs.slice(0, 6).map(job => (
                    <FeaturedJobCard
                      key={String(job.id)}
                      job={job}
                      cardWidth={220}
                      onPress={() => nav.navigate('JobDetail', { job })}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={ws.featJobsGrid}>
                  {displayJobs.slice(0, 6).map(job => (
                    <View key={String(job.id)} style={ws.featJobGridItem}>
                      <FeaturedJobCard
                        job={job}
                        onPress={() => nav.navigate('JobDetail', { job })}
                      />
                    </View>
                  ))}
                </View>
              )}
            </FadeSlide>

            {/* ── Recent Rooms ── */}
            <FadeSlide delay={280}>
              <View style={ws.sectionHeader}>
                <Text style={[ws.sectionTitle, isSmWeb && ws.sectionTitleSm]}>{t('recentRoomsSection')}</Text>
                <TouchableOpacity onPress={() => nav.navigate('Rooms')} style={ws.seeAllBtn}>
                  <Text style={ws.seeAllTxt}>{t('viewAll')}</Text>
                  <Ionicons name="arrow-forward" size={14} color={ORANGE} />
                </TouchableOpacity>
              </View>
              <View style={ws.roomsGrid}>
                {displayRooms.map(room => (
                  <RecentRoomCard
                    key={String(room.id)}
                    room={room}
                    onPress={() => nav.navigate('RoomDetail', { room })}
                  />
                ))}
              </View>
            </FadeSlide>

          </ScrollView>

          {/* ── Right Panel (hidden on small/medium screens) ── */}
          {showRightPanel && <ScrollView style={ws.rightPanel} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={true}>

            {/* Post CTA */}
            <FadeSlide delay={60}>
              <View style={ws.postCtaCard}>
                <Text style={ws.postCtaTitle}>{t('postForFree')}</Text>
                <Text style={ws.postCtaSub}>{t('postForFreeSub').replace('{DISTRICT}', districtLocalName || '')}</Text>
                <TouchableOpacity style={ws.postCtaBtn} onPress={() => nav.navigate('Post')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={ws.postCtaBtnTxt}>{t('postAnAd')}</Text>
                </TouchableOpacity>
              </View>
            </FadeSlide>

            {/* Stats Card */}
            <FadeSlide delay={100}>
              <View style={ws.statsCard}>
                <Text style={ws.statsCardTitle}>{t('platformStats')}</Text>
                <AnimatedStat value={stats.jobs}     label={t('statActiveJobs')}   delay={400}  accent={ORANGE} />
                <View style={ws.statDividerH} />
                <AnimatedStat value={stats.rooms}    label={t('statRoomsListed')}  delay={550}  accent={TEAL} />
                <View style={ws.statDividerH} />
                <AnimatedStat value={stats.vehicles} label={t('statVehicles')}     delay={700}  accent={PURPLE} />
                <View style={ws.statDividerH} />
                <AnimatedStat value={stats.items}    label={t('statItemsForSale')} delay={850} accent='#0ea5e9' />
              </View>
            </FadeSlide>

            {/* Quick Actions */}
            <FadeSlide delay={140}>
              <View style={ws.quickActionsCard}>
                <Text style={ws.statsCardTitle}>{t('quickActions')}</Text>
                <QuickAction icon="briefcase-outline"  label={t('qaJobs')}     color={ORANGE}  onPress={() => nav.navigate('Jobs')} />
                <QuickAction icon="home-outline"       label={t('qaRooms')}    color={TEAL}    onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="car-sport-outline"  label={t('qaVehicles')} color={PURPLE}  onPress={() => nav.navigate('Cars')} />
                <QuickAction icon="pricetag-outline"   label={t('qaBuySell')}  color='#0ea5e9' onPress={() => nav.navigate('BuySell')} />
                <QuickAction icon="sparkles-outline"   label={t('qaAI')}       color={ORANGE}  onPress={() => nav.navigate('AIMatch')} />
              </View>
            </FadeSlide>

          </ScrollView>}
        </View>

        {/* ── Bottom Tab Nav (small web screens only) ── */}
        {!showSidebar && (
          <View style={ws.bottomNav}>
            {[
              { icon: 'home',              label: t('bottomNavHome'),     route: null },
              { icon: 'briefcase-outline', label: t('bottomNavJobs'),     route: 'Jobs' },
              { icon: 'home-outline',      label: t('bottomNavRooms'),    route: 'Rooms' },
              { icon: 'car-sport-outline', label: t('bottomNavVehicles'), route: 'Cars' },
              { icon: 'pricetag-outline',  label: t('bottomNavSell'),     route: 'BuySell' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={ws.bottomNavItem}
                onPress={() => item.route ? nav.navigate(item.route) : null}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.route === null ? ORANGE : '#888'}
                />
                <Text style={[ws.bottomNavLabel, item.route === null && { color: ORANGE }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── District Picker Modal (web) ── */}
      {showDistrictPicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDistrictPicker(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setShowDistrictPicker(false)} />
          <View style={s.districtModalSheet}>
            <View style={s.districtModalHandle} />
            <Text style={s.districtModalTitle}>Switch District</Text>
            <Text style={s.districtModalSub}>All listings will update for your selected area</Text>
            <View style={s.districtModalCards}>
              {DISTRICTS.map(d => {
                const isActive = currentDistrict?.id === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.districtModalCard, isActive && { borderColor: d.color, backgroundColor: d.color + '08' }]}
                    onPress={async () => { await selectDistrict(d.id); setShowDistrictPicker(false); }}
                    activeOpacity={0.85}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: d.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}><Ionicons name="location-sharp" size={22} color={d.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.districtModalName, isActive && { color: d.color }]}>{d.name}</Text>
                      <Text style={s.districtModalMarathi}>{d.nameMarathi}</Text>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={22} color={d.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      )}
      </>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Sticky White Header ── */}
      <View style={[s.headerBand, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => setShowDistrictPicker(true)} activeOpacity={0.8}>
            <Text style={s.brandText}>
              <Text style={s.brandCity}>City</Text>
              <Text style={s.brandRozgar}>Plus</Text>
            </Text>
            <View style={s.locRow}>
              <Ionicons name="location-sharp" size={12} color={ORANGE} />
              <Text style={s.locText}>{districtLocalName || 'Select District'}, Maharashtra</Text>
              <Ionicons name="chevron-down" size={11} color={ORANGE} style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={s.langToggle} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
              <Ionicons name="language" size={12} color={ORANGE} />
              <Text style={s.langToggleTxt}>{langBtnLabel}</Text>
              <Ionicons name="chevron-down" size={10} color={ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDistrictPicker(true)}
              activeOpacity={0.8}
              style={[s.bellBtn, { backgroundColor: (currentDistrict?.color || ORANGE) + '15', borderWidth: 1, borderColor: (currentDistrict?.color || ORANGE) + '40' }]}
            >
              <Ionicons name="location-sharp" size={16} color={currentDistrict?.color || ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
              <Text style={s.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'T'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LangModal visible={showLangPicker} current={lang} onSelect={changeLang} onClose={() => setShowLangPicker(false)} />

      {/* ── District Picker Modal ── */}
      {showDistrictPicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDistrictPicker(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setShowDistrictPicker(false)} />
          <View style={s.districtModalSheet}>
            <View style={s.districtModalHandle} />
            <Text style={s.districtModalTitle}>Switch District</Text>
            <Text style={s.districtModalSub}>All listings will update for your selected area</Text>
            <View style={s.districtModalCards}>
              {DISTRICTS.map(d => {
                const isActive = currentDistrict?.id === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.districtModalCard, isActive && { borderColor: d.color, backgroundColor: d.color + '08' }]}
                    onPress={async () => { await selectDistrict(d.id); setShowDistrictPicker(false); }}
                    activeOpacity={0.85}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: d.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}><Ionicons name="location-sharp" size={22} color={d.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.districtModalName, isActive && { color: d.color }]}>{d.name}</Text>
                      <Text style={s.districtModalMarathi}>{d.nameMarathi}</Text>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={22} color={d.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      )}

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={true}>

        {/* Hero */}
        <FadeSlide delay={0} fromY={-12}>
          <View style={s.heroBanner}>
            <View style={s.heroCircle1} />
            <View style={s.heroCircle2} />
            <Text style={s.heroTitle}>
              {t('heroTitle').split('{DISTRICT}')[0]}<Text style={{ color: '#ffd580' }}>{districtLocalName}</Text>{t('heroTitle').split('{DISTRICT}')[1] || ''}
            </Text>
            <Text style={s.heroSub}>{t('heroSub')}</Text>
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color="#aaa" style={{ marginLeft: 12 }} />
              <TextInput
                style={s.searchInput}
                placeholder={t('homeSearchPlaceholder')}
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

        {/* Stats */}
        <FadeSlide delay={80}>
          <View style={s.statsRow}>
            <AnimatedStat value={stats.jobs}     label={t('statActiveJobs')} delay={300} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.rooms}    label={t('statRooms')}      delay={450} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.vehicles} label={t('statVehicles')}   delay={600} />
            <View style={s.statDivider} />
            <AnimatedStat value={stats.items}    label={t('statItems')}      delay={750} />
          </View>
        </FadeSlide>

        {/* Explore */}
        <FadeSlide delay={120}>
          <Text style={s.sectionTitleStandalone}>{t('explore')}</Text>
          <View style={s.exploreGrid}>
            <ExploreCard icon="briefcase-outline" title={t('sideNavJobs')}     subtitle={`${stats.jobs}+ ${t('jobsOpenings')}`}     color={ORANGE} onPress={() => nav.navigate('Jobs')}    style={{ marginRight: 8 }} />
            <ExploreCard icon="home-outline"      title={t('sideNavRooms')}    subtitle={`${stats.rooms}+ ${t('roomsListings')}`}    color={TEAL}   onPress={() => nav.navigate('Rooms')} />
          </View>
          <View style={[s.exploreGrid, { marginTop: 10 }]}>
            <ExploreCard icon="car-sport-outline" title={t('sideNavVehicles')} subtitle={`${stats.vehicles}+ ${t('vehiclesForRent')}`} color={PURPLE} onPress={() => nav.navigate('Cars')}    style={{ marginRight: 8 }} />
           <ExploreCard icon="pricetag-outline"  title={t('sideNavBuySell')}  subtitle={`${stats.items}+ ${t('itemsCount')}`}       color='#0ea5e9' onPress={() => nav.navigate('BuySell')} />
          </View>
        </FadeSlide>

        <TickerBanner t={t} districtLocalName={districtLocalName} itemCount={stats.items} />

        {/* Recent Jobs */}
        <FadeSlide delay={200}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('recentJobsSection')}</Text>
            <TouchableOpacity onPress={() => nav.navigate('Jobs')}>
              <Text style={s.seeAllBtn}>{t('viewAll')} →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.jobsScrollContent}
            style={s.jobsScroll}
          >
            {displayJobs.slice(0, 6).map((job) => (
              <FeaturedJobCard
                key={String(job.id)}
                job={job}
                cardWidth={SCREEN_W * 0.60}
                onPress={() => nav.navigate('JobDetail', { job })}
              />
            ))}
          </ScrollView>
        </FadeSlide>

        {/* Recent Rooms */}
        <FadeSlide delay={260}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('recentRoomsSection')}</Text>
            <TouchableOpacity onPress={() => nav.navigate('Rooms')}>
              <Text style={s.seeAllBtn}>{t('seeAllArrow')}</Text>
            </TouchableOpacity>
          </View>
          {displayRooms.map(room => (
            <RecentRoomCard key={String(room.id)} room={room} onPress={() => nav.navigate('RoomDetail', { room })} />
          ))}
        </FadeSlide>

        {/* AI Banner */}
        <FadeSlide delay={300}>
          <TouchableOpacity style={s.aiCard} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.9}>
            <View style={s.aiLeft}>
              <View style={s.aiIconWrap}><Ionicons name="sparkles" size={22} color={ORANGE} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiTitle}>{t('homeAiTitle')}</Text>
                <Text style={s.aiPrompt}>{t('homeAiPrompt').replace('{DISTRICT}', districtLocalName || '')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ORANGE} />
          </TouchableOpacity>
        </FadeSlide>

      </ScrollView>
    </View>
  );
}

// ── WEB STYLES ─────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  // Top Nav
  topNav: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#ececec',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
    zIndex: 100,
  },
  topNavInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 0, paddingVertical: 12,
    gap: 0,
  },
  topNavInnerSm: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },

  /* Mobile web 2-row header */
  topNavSm: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  topNavSmRow1: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  topNavSmRow2: { width: '100%' },
  brandRow:   { width: 210, flexShrink: 0, flexGrow: 0, paddingHorizontal: 16 },
  brandText:  { fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  brandCity:{ color: '#111111' },
  brandRozgar:{ color: ORANGE },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText:    { color: '#888', fontSize: 11, fontWeight: '500' },

  topSearchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 10, height: 44,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  topSearchInput: { flex: 1, height: 44, paddingHorizontal: 10, fontSize: 14, color: '#333', outlineStyle: 'none' },
  topSearchBtn:   { height: 44, paddingHorizontal: 24, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  topSearchBtnSm:  { width: 44, height: 44, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  topSearchBtnTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },

  topNavRight: { width: 220, flexShrink: 0, flexGrow: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 16 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: ORANGE + '44',
  },
  langBtnTxt: { color: ORANGE, fontSize: 12, fontWeight: '700' },
  bellBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
  },
  profileBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Body
  body:       { flex: 1, flexDirection: 'row', backgroundColor: '#f3f4f6' },

  // Sidebar
  sidebar: {
    width: 210, flexShrink: 0, flexGrow: 0, backgroundColor: '#fff',
    borderRightWidth: 1, borderRightColor: '#ececec',
    paddingTop: 20, paddingHorizontal: 12,
  },
  sideNavSection: { fontSize: 10, fontWeight: '800', color: '#bbb', letterSpacing: 1.2, paddingHorizontal: 10, marginBottom: 6 },
  sideNavItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2,
  },
  sideNavItemActive: { backgroundColor: '#fff7f0' },
  sideNavLabel:      { fontSize: 15, fontWeight: '600', color: '#444' },
  sideNavLabelActive:{ color: ORANGE, fontWeight: '700' },

  sidePromo: {
    marginTop: 24, backgroundColor: '#fff7f0', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: ORANGE + '33',
  },
  sidePromoTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 8, marginBottom: 4 },
  sidePromoSub:   { fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 12 },
  sidePromoCta:   { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  sidePromoCtaTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },

  // Main
  main: { flex: 1, flexShrink: 1, flexGrow: 1, minWidth: 0, backgroundColor: '#f3f4f6' },  // overridden inline for mobile-web

  // Hero
  heroBanner: {
    backgroundColor: ORANGE,
    borderRadius: 12, padding: 24, paddingVertical: 22,
    overflow: 'hidden', position: 'relative',
    marginBottom: 12,
  },
  heroBannerSm: { padding: 16, borderRadius: 12 },

  // Compact hero for mobile web — matches native APK layout exactly
  heroBannerCompact: {
    backgroundColor: '#f97316',
    borderRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    marginBottom: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBannerCompactTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 34,
    marginBottom: 6,
  },
  heroBannerCompactSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 18,
    fontWeight: '500',
  },
  heroBannerCompactSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 48,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  heroBannerSearchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
    outlineStyle: 'none',
  },
  heroBannerSearchBtn: {
    width: 46,
    height: 48,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50 },
  heroCircle2: { position: 'absolute', width: 130, height: 130, borderRadius: 65,  backgroundColor: 'rgba(255,255,255,0.08)', bottom: -40, right: 60 },
  heroCircle3: { position: 'absolute', width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(0,0,0,0.06)',       top: 20,    right: 260 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroTag:     { fontSize: 11, color: 'rgba(255,255,255,0.80)', fontWeight: '600', marginBottom: 6 },
  heroTitle:   { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38, marginBottom: 6 },
  heroTitleSm:  { fontSize: 22, lineHeight: 28 },
  heroSub:     { fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: '400', marginBottom: 12 },
  heroSubSm:    { fontSize: 12, marginBottom: 10 },
  heroBadges:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  heroBadge:   { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  heroBadgeSm:  { paddingHorizontal: 8, paddingVertical: 2 },
  heroBadgeTxt:{ color: '#fff', fontSize: 11, fontWeight: '600' },
  heroBadgeTxtSm:{ fontSize: 10 },

  heroStats: {
    flexDirection: 'column', gap: 6, minWidth: 140,
  },
  heroStatsSm: {
    flexDirection: 'row', minWidth: 0, width: '100%', gap: 5,
    justifyContent: 'space-around',
  },
  heroStatCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroStatItem:    { alignItems: 'center', paddingVertical: 10 },
  heroStatItemSm:  { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 },
  heroStatNum:     { fontSize: 28, fontWeight: '900', color: '#fff' },
  heroStatNumSm:   { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 1, textAlign: 'center' },
  heroStatLabelSm: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 1, textAlign: 'center' },
  heroStatDivider:   { width: '90%', height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroStatDividerSm: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center' },

  // Ticker web
  ticker: { borderRadius: 10, marginBottom: 12 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 2 },
  sectionTitle:  { fontSize: 17, fontWeight: '800', color: '#111' },
  sectionTitleSm: { fontSize: 15 },
  seeAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllTxt:     { fontSize: 13, fontWeight: '700', color: ORANGE },

  // Explore — 4-column grid
  exploreGrid:  { flexDirection: 'row', marginBottom: 16, gap: 10 },
  exploreCard:  { borderRadius: 16, padding: 16, minHeight: 150 },
  exploreCardSm: { padding: 12, minHeight: 100 },
  exploreTitle:  { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 3 },
  exploreTitleSm: { fontSize: 14 },

  // Featured jobs grid — 2 col
  featJobsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featJobsGridSm:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  featJobCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, overflow: 'hidden' },
  featJobCardSmWeb: { width: '47%' },
  featJobCardSm:{ width: '100%' },

  // Recent jobs
  jobCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', marginBottom: 10, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  jobThumb: { width: 52, height: 52, borderRadius: 14 },
  jobTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  // Rooms grid — 3 col
  roomsGrid: { flexDirection: 'row', gap: 14, marginBottom: 28, flexWrap: 'wrap' },
  roomCard:  { flex: 1, minWidth: 200, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  roomImgPlaceholder: { height: 160, backgroundColor: '#2d2d3e', alignItems: 'center', justifyContent: 'center', position: 'relative' },

  // Right Panel
  rightPanel: { width: 220, flexShrink: 0, flexGrow: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 20, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#ececec' },

  postCtaCard: {
    backgroundColor: ORANGE, borderRadius: 0, padding: 18, marginBottom: 0, paddingTop: 22,
  },
  postCtaTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  postCtaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginBottom: 14, lineHeight: 18 },
  postCtaBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  postCtaBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '700' },

  statsCard: { backgroundColor: '#fff', borderRadius: 0, padding: 18, paddingHorizontal: 20, marginBottom: 0 },
  statsCardTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 14 },
  statCard:   { paddingVertical: 10 },
  statNum:    { fontSize: 24, fontWeight: '900' },
  statLabel:  { fontSize: 12, color: '#888', fontWeight: '500', marginTop: 2 },
  statDividerH: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },

  quickActionsCard: { backgroundColor: '#fff', borderRadius: 0, padding: 18, paddingHorizontal: 20, borderWidth: 0, borderTopWidth: 1, borderColor: '#f0f0f0' },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderRadius: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
  quickActionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: '#222', flex: 1 },

  featJobGridItem: { width: '47.5%' },
  // Recent Jobs horizontal scroll carousel (small web)
  jobsScroll: { marginBottom: 4 },
  jobsScrollContent: {
    paddingHorizontal: 0,
    paddingBottom: 8,
    gap: 10,
  },

  // Bottom tab nav (small web)
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    paddingBottom: IS_WEB ? 8 : 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    marginTop: 2,
  },
});

// ── MOBILE STYLES (unchanged from original) ────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  headerBand: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  headerTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandText:       { fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  brandCity:     { color: '#111111' },
  brandRozgar:     { color: ORANGE },
  locRow:          { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText:         { color: '#888', fontSize: 11, fontWeight: '500' },
  profileBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  profileInitial:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  bellBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  langToggle:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: ORANGE },
  langToggleTxt:   { color: ORANGE, fontSize: 11, fontWeight: '700' },

  heroBanner: { backgroundColor: ORANGE, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  heroCircle1:{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50 },
  heroCircle2:{ position: 'absolute', width: 130, height: 130, borderRadius: 65,  backgroundColor: 'rgba(255,255,255,0.08)', bottom: -40, right: 60 },
  heroTitle:  { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34, marginBottom: 6 },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginBottom: 18, fontWeight: '500' },
  searchBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, height: 48, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  searchInput:{ flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: '#333' },
  searchBtn:  { width: 46, height: 48, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  statItem:   { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 17, fontWeight: '900', color: '#111' },
  statLabel:  { fontSize: 9, color: '#888', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  statDivider:{ width: 1, height: 26, backgroundColor: '#eee' },

  sectionHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  sectionTitle:           { fontSize: 17, fontWeight: '800', color: '#111' },
  sectionTitleStandalone: { fontSize: 17, fontWeight: '800', color: '#111', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  seeAllBtn:              { fontSize: 13, fontWeight: '700', color: ORANGE },

  exploreGrid:  { flexDirection: 'row', paddingHorizontal: 16 },
  exploreCard:  { flex: 1, borderRadius: 16, padding: 16, minHeight: 130, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  exploreInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  exploreIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  exploreBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  exploreTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  exploreSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  exploreCircle1:{ position: 'absolute', width: 90, height: 90, borderRadius: 45, bottom: -20, right: -20 },
  exploreCircle2:{ position: 'absolute', width: 60, height: 60, borderRadius: 30, bottom: 20,  right: 40 },

  ticker:     { backgroundColor: TICKER_BG, height: 38, overflow: 'hidden', marginTop: 12, justifyContent: 'center', alignItems: 'center' },
  tickerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  tickerText: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },

  featJobCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' },
  featJobCardGrid:{ flex: 1, width: 'auto' },
  featJobTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featJobIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  featJobTitle:   { fontSize: 13, fontWeight: '700', color: '#111' },
  featJobCompany: { fontSize: 11, color: '#aaa', marginTop: 2 },
  featJobBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  featJobSalary:  { fontSize: 13, fontWeight: '800', color: ORANGE, flex: 1, flexWrap: 'wrap' },
  applyBtn:       { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, alignItems: 'center', flexShrink: 0 },
  applyBtnTxt:    { color: '#fff', fontSize: 12, fontWeight: '700' },

  roomCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  roomImgPlaceholder: { height: 130, backgroundColor: '#2d2d3e', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  availBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#16a34a', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  availTxt:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  roomInfo:    { padding: 14 },
  roomTitle:   { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  roomMeta:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roomChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  roomChipTxt: { fontSize: 11, color: '#666', fontWeight: '500' },
  roomRent:    { fontSize: 16, fontWeight: '800', color: '#111' },

  aiCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE, padding: 14, marginHorizontal: 16, marginVertical: 8, shadowColor: ORANGE, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  aiLeft:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiIconWrap: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  aiTitle:    { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 3 },
  aiPrompt:   { fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 16 },

  jobCard:         { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', marginHorizontal: 16, marginBottom: 10, padding: 14, position: 'relative', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  jobCardFeatured: { borderLeftWidth: 3, borderLeftColor: ORANGE },
  jobCardUrgent:   { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  jobFeatBadge:    { position: 'absolute', top: 0, right: 12, backgroundColor: ORANGE, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, paddingVertical: 2, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 3, zIndex: 10 },
  jobFeatTxt:      { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  jobRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobThumb:        { width: 44, height: 44, borderRadius: 11, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  jobTitle:        { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  jobSubRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobSub:          { fontSize: 11, color: '#777' },
  jobChipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  jobLocChip:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  jobLocTxt:       { fontSize: 10, color: '#666', fontWeight: '500' },
  jobExpChip:      { backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#bbf7d0' },
  jobExpTxt:       { fontSize: 10, color: '#15803d', fontWeight: '600' },
  jobSkillsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  jobSkillTag:     { backgroundColor: '#f8f8f8', borderWidth: 0.5, borderColor: '#e5e5e5', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  jobSkillTxt:     { fontSize: 9, color: '#666', fontWeight: '500' },
  salaryCol:       { alignItems: 'flex-end', flexShrink: 0 },
  priceBadge:      { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt:        { color: '#fff', fontSize: 12, fontWeight: '700' },
  freshnessRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  freshnessDot:    { width: 5, height: 5, borderRadius: 3 },
  jobTime:         { fontSize: 10, color: '#bbb', fontWeight: '500' },

  viewAll:    { marginHorizontal: 16, marginTop: 4, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 13, color: ORANGE, fontWeight: '700' },

  // Recent Jobs horizontal scroll carousel (mobile)
  mobileJobsGrid: { flexDirection: 'row' },
  mobileJobsGridItem: { width: SCREEN_W * 0.56 },
  jobsScroll: { marginBottom: 4 },
  jobsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },

  // ── District picker bottom sheet ──────────────────────────────────────────
  districtModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  districtModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 18,
  },
  districtModalTitle: {
    fontSize: 20, fontWeight: '800', color: '#111',
    marginBottom: 4,
  },
  districtModalSub: {
    fontSize: 13, color: '#888', marginBottom: 20,
  },
  districtModalCards: { gap: 12 },
  districtModalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 14, padding: 14,
    backgroundColor: '#fafafa',
  },
  districtModalEmoji: { display: 'none' },
  districtModalName:  { fontSize: 17, fontWeight: '700', color: '#111' },
  districtModalMarathi: { fontSize: 13, color: '#888', marginTop: 1 },
});

const lm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: IS_WEB ? 'center' : 'flex-end', alignItems: IS_WEB ? 'center' : 'stretch' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  sheetWeb: { borderRadius: 20, width: 360, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 20 },
  title:    { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 16 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: 'transparent' },
  rowActive:    { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  native:       { fontSize: 17, fontWeight: '700', color: '#111', minWidth: 60 },
  nativeActive: { color: ORANGE },
  label:        { fontSize: 13, color: '#888', fontWeight: '500' },
});
