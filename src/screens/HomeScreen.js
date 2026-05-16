import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CAT_ICONS } from '../utils/constants';
import { useLang, LANGUAGES } from '../utils/i18n';
import { timeAgo } from '../utils/api';
import { CARS } from './CarScreen';
import { ROOMS } from './RoomScreen';
import { SAMPLE_ITEMS } from './BuySellScreen';
import GeometricBg from '../components/GeometricBg';
import { GEO } from '../components/UI';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';
const PURPLE = '#8b5cf6';

// ── Language Modal ────────────────────────────────────────────
function LangModal({ visible, current, onSelect, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={lm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={lm.sheet}>
          <View style={lm.sheetTop} />
          <Text style={lm.title}>Choose Language</Text>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[lm.row, current === l.code && lm.rowActive]}
              onPress={() => { onSelect(l.code); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={[lm.native, current === l.code && lm.nativeActive]}>{l.native}</Text>
              <Text style={lm.label}>{l.label}</Text>
              {current === l.code && <Ionicons name="checkmark-circle" size={18} color={ORANGE} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Service Card (3D geometric) ────────────────────────────────
function ServiceCard({ title, sub, icon, iconColor, onPress, accent, wide, tall }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[sc.card,
        wide && { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
        tall && { flex: 1 },
      ]}
    >
      {/* Shimmer top line */}
      <View style={[sc.shine, { backgroundColor: accent + '40' }]} />
      {/* Background geo shape */}
      {!wide && (
        <View style={[sc.bgGeo, { borderColor: accent + '18', backgroundColor: accent + '06' }]} />
      )}
      {/* Icon */}
      <View style={[sc.iconWrap, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
        <Ionicons name={icon} size={wide ? 22 : 26} color={iconColor || accent} />
      </View>
      <View style={{ flex: wide ? 1 : undefined }}>
        <Text style={[sc.title, { color: iconColor || accent }]}>{title}</Text>
        <Text style={sc.sub}>{sub}</Text>
      </View>
      {wide && <Ionicons name="chevron-forward" size={16} color={accent + '80'} />}
    </TouchableOpacity>
  );
}

// ── AI Card ────────────────────────────────────────────────────
function AICard({ onPress, t }) {
  const prompts = [
    'What salary should I ask for a driver in Nanded?',
    'How do I get hired quickly in Nanded?',
    'Best paying jobs in Nanded right now?',
  ];
  const prompt = prompts[Math.floor(Date.now() / 60000) % prompts.length];
  return (
    <TouchableOpacity style={ai.card} onPress={onPress} activeOpacity={0.85}>
      <View style={ai.topLine} />
      {/* Geometric bg triangles */}
      <View style={[ai.tri1, { borderBottomColor: ORANGE + '12' }]} />
      <View style={[ai.tri2, { borderBottomColor: INDIGO + '10' }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={ai.iconWrap}>
          <Ionicons name="sparkles" size={20} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={ai.title}>{t('aiAssistant')}</Text>
            <View style={ai.badge}><Text style={ai.badgeTxt}>AI</Text></View>
          </View>
          <Text style={ai.prompt} numberOfLines={2}>"{prompt}"</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={ORANGE + '80'} />
      </View>
    </TouchableOpacity>
  );
}

// ── Recent Job Card ────────────────────────────────────────────
function RecentJobCard({ job, onPress }) {
  const iconName = CAT_ICONS[job.category || job.icon] || 'briefcase-outline';
  const ageDays = (Date.now() - (job.timestamp || 0)) / 86400000;
  const freshnessColor = ageDays < 1 ? '#4ade80' : ageDays < 7 ? ORANGE : 'rgba(255,255,255,0.2)';
  const freshnessLabel = ageDays < 1 ? 'Today' : ageDays < 7 ? `${Math.floor(ageDays)}d ago` : job.timestamp ? timeAgo(job.timestamp) : (job.jobTime || 'Recent');
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 2) : [];
  const expLabel = job.experience ? job.experience : job.fresher_ok ? 'Fresher OK' : null;
  const accentColor = job.featured ? ORANGE : job.urgent ? '#ef4444' : INDIGO;

  return (
    <TouchableOpacity style={[jc.card, { borderLeftColor: accentColor }]} onPress={onPress} activeOpacity={0.85}>
      <View style={jc.shine} />
      {job.featured && (
        <View style={[jc.badge, { backgroundColor: ORANGE }]}>
          <Ionicons name="star" size={8} color="#fff" />
          <Text style={jc.badgeTxt}>FEATURED</Text>
        </View>
      )}
      {job.urgent && !job.featured && (
        <View style={[jc.badge, { backgroundColor: '#ef4444' }]}>
          <Ionicons name="flame" size={8} color="#fff" />
          <Text style={jc.badgeTxt}>URGENT</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[jc.thumb, { backgroundColor: accentColor + '18', borderColor: accentColor + '30' }]}>
          <Ionicons name={iconName} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={jc.title} numberOfLines={1}>{job.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Ionicons name="business-outline" size={10} color="rgba(255,255,255,0.3)" />
            <Text style={jc.company} numberOfLines={1}>{job.company}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            <View style={jc.locChip}>
              <Ionicons name="location-outline" size={9} color="rgba(255,255,255,0.35)" />
              <Text style={jc.locTxt}>{job.location || job.loc}</Text>
            </View>
            {expLabel && (
              <View style={jc.expChip}>
                <Text style={jc.expTxt}>{expLabel}</Text>
              </View>
            )}
          </View>
          {skills.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
              {skills.map((sk, i) => (
                <View key={i} style={jc.skillTag}>
                  <Text style={jc.skillTxt}>{sk}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={jc.salaryBadge}>
            <Text style={jc.salaryTxt}>{job.salary}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <View style={[jc.dot, { backgroundColor: freshnessColor }]} />
            <Text style={[jc.time, { color: freshnessColor }]}>{freshnessLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user } = useAuth();
  const { lang, changeLang, t } = useLang();
  const [showLangPicker, setShowLangPicker] = React.useState(false);

  const currentLang = LANGUAGES.find(l => l.code === lang);
  const langBtnLabel = currentLang?.native || 'EN';
  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs
    .sort((a, b) =>
      ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
      ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
      b.timestamp - a.timestamp)
    .slice(0, 3);

  const carCount     = CARS?.length || 0;
  const roomCount    = ROOMS?.length || 0;
  const buySellCount = SAMPLE_ITEMS?.length || 0;

  const demoJobs = [
    { id: 'demo1', title: 'Telecaller', company: 'Dhanraj Enterprises', location: 'Nanded', salary: '₹12,000/mo', category: 'Other', icon: 'call-outline', fresher_ok: true, skills: ['Marathi', 'Hindi'], jobTime: 'Full time' },
    { id: 'demo2', title: 'Web Developer', company: 'TechSoft Solutions', location: 'Nanded', salary: '₹25,000/mo', category: 'Other', icon: 'globe-outline', experience: '1 yr exp', skills: ['React', 'Node.js'], verified_employer: true, jobTime: 'Full time' },
    { id: 'demo3', title: 'Shop Assistant', company: 'Reliance Retail', location: 'Station Road', salary: '₹12,000/mo', category: 'Shop Assistant', icon: 'storefront-outline', fresher_ok: true, skills: ['Customer service'], jobTime: 'Full time' },
  ];
  const displayJobs = recentJobs.length > 0 ? recentJobs : demoJobs;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 36 }}>

      {/* ── Hero Header ── */}
      <View style={s.header}>
        <GeometricBg />
        {/* Grid dots overlay */}
        <View style={s.gridOverlay} />

        {/* Geometric accents in header */}
        <View style={[s.hGeo1, { borderBottomColor: ORANGE + '20' }]} />
        <View style={s.hGeo2} />
        <View style={s.hGeo3} />

        <View style={s.headerTop}>
          <View>
            <Text style={s.brand}>
              <Text style={s.brandNanded}>Nanded</Text>
              <Text style={s.brandRozgar}>Rozgar</Text>
            </Text>
            <View style={s.locRow}>
              <Ionicons name="location-sharp" size={12} color={ORANGE} />
              <Text style={s.locTxt}>Nanded, Maharashtra</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={s.langBtn} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
              <Ionicons name="language" size={12} color={ORANGE} />
              <Text style={s.langBtnTxt}>{langBtnLabel}</Text>
              <Ionicons name="chevron-down" size={10} color={ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
              <Text style={s.profileInit}>{user?.name?.[0]?.toUpperCase() || 'N'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {[
            { label: 'Jobs', value: activeJobs.length || '50+', color: ORANGE },
            { label: 'Cars', value: carCount || '20+', color: INDIGO },
            { label: 'Rooms', value: roomCount || '35+', color: CYAN },
            { label: 'Items', value: buySellCount || '40+', color: PURPLE },
          ].map(stat => (
            <View key={stat.label} style={s.statPill}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLbl}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <LangModal visible={showLangPicker} current={lang} onSelect={changeLang} onClose={() => setShowLangPicker(false)} />

      {/* ── AI Card ── */}
      <AICard onPress={() => nav.navigate('AIMatch')} t={t} />

      {/* ── Services ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionLine} />
        <Text style={s.sectionTitle}>{t('ourServices')}</Text>
        <View style={s.sectionLine} />
      </View>

      <View style={s.grid}>
        <View style={{ flexDirection: 'row', gap: 10, height: 190 }}>
          {/* Featured — Jobs */}
          <ServiceCard
            title={t('findJobs')}
            sub={`${activeJobs.length || '50+'} ${t('opening')}`}
            icon="briefcase"
            accent={ORANGE}
            iconColor={ORANGE}
            onPress={() => nav.navigate('Jobs')}
            tall
          />
          <View style={{ flex: 1, gap: 10 }}>
            <ServiceCard title={t('carRental')} sub={`${carCount} ${t('vehicles')}`} icon="car-sport" accent={INDIGO} iconColor={INDIGO} onPress={() => nav.navigate('Cars')} tall />
            <ServiceCard title={t('roomsPG')} sub={`${roomCount} ${t('listings')}`} icon="business" accent={CYAN} iconColor={CYAN} onPress={() => nav.navigate('Rooms')} tall />
          </View>
        </View>
        {/* Wide row */}
        <ServiceCard
          title={t('buySell')}
          sub={lang === 'en' ? 'Furniture, Electronics, Hobby' : lang === 'mr' ? 'फर्निचर, इलेक्ट्रॉनिक्स, छंद' : 'फर्नीचर, इलेक्ट्रॉनिक्स, शौक'}
          icon="pricetag"
          accent={PURPLE}
          iconColor={PURPLE}
          onPress={() => nav.navigate('BuySell')}
          wide
        />
      </View>

      {/* ── Recent Jobs ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionLine} />
        <Text style={s.sectionTitle}>{t('recentJobs')}</Text>
        <View style={s.sectionLine} />
      </View>
      <TouchableOpacity style={s.seeAll} onPress={() => nav.navigate('Jobs')}>
        <Text style={s.seeAllTxt}>See all →</Text>
      </TouchableOpacity>

      {displayJobs.map(job => (
        <RecentJobCard
          key={job.id || job.title}
          job={job}
          onPress={() => job.status === 'active' ? nav.navigate('JobDetail', { job }) : nav.navigate('Jobs')}
        />
      ))}

      <TouchableOpacity onPress={() => nav.navigate('Jobs')} style={s.viewAllBtn}>
        <View style={s.viewAllInner}>
          <Text style={s.viewAllTxt}>{t('viewAllJobs')}</Text>
          <Ionicons name="arrow-forward" size={14} color={ORANGE} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Service Card styles ────────────────────────────────────────
const sc = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  shine: { position: 'absolute', top: 0, left: 20, right: 20, height: 1 },
  bgGeo: {
    position: 'absolute', bottom: -10, right: -10,
    width: 70, height: 70, borderRadius: 12,
    borderWidth: 1, transform: [{ rotate: '20deg' }],
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontWeight: '500' },
});

// ── AI Card styles ─────────────────────────────────────────────
const ai = StyleSheet.create({
  card: { marginHorizontal: 14, marginTop: 12, backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1.5, borderColor: ORANGE + '35', borderRadius: 16, padding: 16, overflow: 'hidden', shadowColor: ORANGE, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  topLine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: ORANGE + '40' },
  tri1: { position: 'absolute', right: 16, top: 8, width: 0, height: 0, borderLeftWidth: 18, borderRightWidth: 18, borderBottomWidth: 30, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  tri2: { position: 'absolute', right: 42, bottom: 6, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 17, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: ORANGE + '22', borderWidth: 1, borderColor: ORANGE + '40', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  badge: { backgroundColor: ORANGE + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: ORANGE + '40' },
  badgeTxt: { fontSize: 9, color: ORANGE, fontWeight: '800', letterSpacing: 0.5 },
  prompt: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 16 },
});

// ── Job Card styles ────────────────────────────────────────────
const jc = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderLeftWidth: 3, marginHorizontal: 14, marginBottom: 10, padding: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  shine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  badge: { position: 'absolute', top: 0, right: 12, paddingVertical: 3, paddingHorizontal: 8, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
  badgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  thumb: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  company: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  locTxt: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  expChip: { backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 0.5, borderColor: 'rgba(74,222,128,0.3)' },
  expTxt: { fontSize: 10, color: '#4ade80', fontWeight: '600' },
  skillTag: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 7 },
  skillTxt: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  salaryBadge: { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  salaryTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  time: { fontSize: 10, fontWeight: '500' },
});

// ── Main styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080812' },
  header: {
    backgroundColor: '#0e0e20',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  gridOverlay: { position: 'absolute', inset: 0, opacity: 0.03 },
  hGeo1: {
    position: 'absolute', top: -10, right: 40,
    width: 0, height: 0,
    borderLeftWidth: 50, borderRightWidth: 50, borderBottomWidth: 86,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  hGeo2: {
    position: 'absolute', top: 20, right: 10,
    width: 40, height: 40,
    backgroundColor: INDIGO + '12',
    transform: [{ rotate: '30deg' }],
    borderRadius: 6,
  },
  hGeo3: {
    position: 'absolute', bottom: 10, left: -10,
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: CYAN + '18',
    backgroundColor: 'transparent',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  brand: { fontSize: 24, fontWeight: '900', letterSpacing: 0.3 },
  brandNanded: { color: '#fff' },
  brandRozgar: { color: ORANGE },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500' },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: ORANGE + '35' },
  langBtnTxt: { color: ORANGE, fontSize: 11, fontWeight: '700' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  profileInit: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statsStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  statPill: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 20, paddingBottom: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5 },
  seeAll: { alignSelf: 'flex-end', paddingHorizontal: 14, marginTop: -8, marginBottom: 4 },
  seeAllTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },
  grid: { paddingHorizontal: 14, gap: 10 },
  viewAllBtn: { marginHorizontal: 14, marginTop: 8, marginBottom: 4 },
  viewAllInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: ORANGE + '30', backgroundColor: ORANGE + '08' },
  viewAllTxt: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});

const lm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0e0e1c', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sheetTop: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent' },
  rowActive: { borderColor: ORANGE + '50', backgroundColor: ORANGE + '10' },
  native: { fontSize: 17, fontWeight: '700', color: '#fff', minWidth: 60 },
  nativeActive: { color: ORANGE },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
});
