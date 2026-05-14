import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C, CAT_ICONS } from '../utils/constants';
import { useLang, LANGUAGES } from '../utils/i18n';
import { timeAgo } from '../utils/api';
import { CARS } from './CarScreen';
import { ROOMS } from './RoomScreen';
import { SAMPLE_ITEMS } from './BuySellScreen';

const ORANGE = '#f97316';

// ── Language Picker Modal ─────────────────────────────────────────────────────
function LangModal({ visible, current, onSelect, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={lm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={lm.sheet}>
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
              {current === l.code && (
                <Ionicons name="checkmark-circle" size={18} color={ORANGE} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── AI Prompt Card ────────────────────────────────────────────────────────────
function AIPromptCard({ onPress, t }) {
  const prompts = [
    'What salary should I ask for a driver in Nanded?',
    'How do I get hired quickly in Nanded?',
    'Best paying jobs in Nanded right now?',
  ];
  const randomPrompt = prompts[Math.floor(Date.now() / 60000) % prompts.length];
  return (
    <TouchableOpacity style={s.aiCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.aiLeft}>
        <View style={s.aiIconWrap}>
          <Ionicons name="sparkles" size={20} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.aiTitle}>{t('aiAssistant')}</Text>
          <Text style={s.aiPrompt} numberOfLines={2}>"{randomPrompt}"</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={ORANGE} />
    </TouchableOpacity>
  );
}

// ── Recent Job Card (improved) ────────────────────────────────────────────────
function RecentJobCard({ job, onPress }) {
  const iconName = CAT_ICONS[job.category || job.icon] || 'briefcase';

  const ageDays = (Date.now() - (job.timestamp || 0)) / 86400000;
  const freshnessColor = ageDays < 1 ? '#16a34a' : ageDays < 7 ? ORANGE : '#bbb';
  const freshnessLabel = ageDays < 1
    ? 'Today'
    : ageDays < 7
    ? `${Math.floor(ageDays)}d ago`
    : job.timestamp ? timeAgo(job.timestamp) : (job.jobTime || 'Recent');

  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 2) : [];
  const expLabel = job.experience ? job.experience : job.fresher_ok ? 'Fresher OK' : null;

  return (
    <TouchableOpacity
      style={[s.jobCard, job.featured && s.jobCardFeatured, job.urgent && s.jobCardUrgent]}
      onPress={onPress}
      activeOpacity={0.85}
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
        {/* Icon */}
        <View style={s.jobThumb}>
          <Ionicons name={iconName} size={20} color={ORANGE} />
        </View>

        {/* Body */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
            {job.verified_employer && (
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
            )}
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
            {expLabel && (
              <View style={s.jobExpChip}>
                <Text style={s.jobExpTxt}>{expLabel}</Text>
              </View>
            )}
          </View>

          {/* Skill tags */}
          {skills.length > 0 && (
            <View style={s.jobSkillsRow}>
              {skills.map((sk, i) => (
                <View key={i} style={s.jobSkillTag}>
                  <Text style={s.jobSkillTxt}>{sk}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right: salary + freshness */}
        <View style={s.salaryCol}>
          <View style={s.priceBadge}>
            <Text style={s.priceTxt}>{job.salary}</Text>
          </View>
          <View style={[s.freshnessRow, { marginTop: 6 }]}>
            <View style={[s.freshnessDot, { backgroundColor: freshnessColor }]} />
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
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user, role } = useAuth();
  const { lang, changeLang, t } = useLang();
  const [showLangPicker, setShowLangPicker] = React.useState(false);

  const currentLang = LANGUAGES.find(l => l.code === lang);
  const langBtnLabel = currentLang?.native || 'EN';

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs
    .sort((a, b) =>
      ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
      ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
      b.timestamp - a.timestamp
    )
    .slice(0, 3);

  const carCount     = CARS?.length || 0;
  const roomCount    = ROOMS?.length || 0;
  const buySellCount = SAMPLE_ITEMS?.length || 0;

  // Fallback demo jobs (shown when backend has no data)
  const demoJobs = [
    {
      id: 'demo1', title: 'Telecaller', company: 'Dhanraj Enterprises',
      location: 'Nanded', salary: '₹12,000/mo', category: 'Other',
      icon: 'call-outline', type: 'Full-time', fresher_ok: true,
      skills: ['Marathi', 'Hindi', 'MS Excel'], verified_employer: false,
      jobTime: 'Full time',
    },
    {
      id: 'demo2', title: 'Web Developer', company: 'TechSoft Solutions',
      location: 'Nanded', salary: '₹25,000/mo', category: 'Other',
      icon: 'globe-outline', type: 'Full-time', experience: '1 yr exp',
      skills: ['React', 'Node.js', 'HTML/CSS'], verified_employer: true,
      jobTime: 'Full time',
    },
    {
      id: 'demo3', title: 'Shop Assistant', company: 'Reliance Retail',
      location: 'Station Road', salary: '₹12,000/mo', category: 'Shop Assistant',
      icon: 'storefront-outline', type: 'Full-time', fresher_ok: true,
      skills: ['Customer service', 'Billing'], verified_employer: false,
      jobTime: 'Full time',
    },
  ];

  const displayJobs = recentJobs.length > 0 ? recentJobs : demoJobs;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* ── Dark header ── */}
      <View style={s.headerBand}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brandText}>
              <Text style={s.brandNanded}>Nanded</Text>
              <Text style={s.brandRozgar}>Rozgar</Text>
            </Text>
            <View style={s.locRow}>
              <Ionicons name="location-sharp" size={13} color="#f97316" />
              <Text style={s.locText}>Nanded, Maharashtra</Text>
            </View>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
            <Text style={s.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'N'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.langToggle} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
          <Ionicons name="language" size={13} color="#f97316" />
          <Text style={s.langToggleTxt}>{langBtnLabel}</Text>
          <Ionicons name="chevron-down" size={11} color="#f97316" />
        </TouchableOpacity>
      </View>

      <LangModal
        visible={showLangPicker}
        current={lang}
        onSelect={changeLang}
        onClose={() => setShowLangPicker(false)}
      />

      {/* ── AI Prompt Card ── */}
      <AIPromptCard onPress={() => nav.navigate('AIMatch')} t={t} />

      {/* ── Services grid ── */}
      <Text style={s.sectionTitle}>{t('ourServices')}</Text>
      <View style={s.grid}>

        <View style={s.gridTopRow}>
          <TouchableOpacity style={s.featuredCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <Ionicons name="briefcase" size={80} color="rgba(249,115,22,0.12)" style={s.featuredWatermark} />
            <View style={s.featuredContent}>
              <View style={s.featuredIconWrap}>
                <Ionicons name="briefcase" size={26} color="#f97316" />
              </View>
              <Text style={s.featuredTitle}>{t('findJobs')}</Text>
              <Text style={s.featuredSub}>{activeJobs.length} {t('opening')}</Text>
            </View>
          </TouchableOpacity>

          <View style={s.gridRightCol}>
            <TouchableOpacity style={s.smallCard} onPress={() => nav.navigate('Cars')} activeOpacity={0.85}>
              <View style={s.smallCardInner}>
                <View>
                  <Text style={s.smallCardTitle}>{t('carRental')}</Text>
                  <Text style={s.smallCardSub}>{carCount} {t('vehicles')}</Text>
                </View>
                <View style={[s.smallCardIcon, { backgroundColor: '#e8f4ff' }]}>
                  <Ionicons name="car-sport" size={20} color="#3b82f6" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.smallCard} onPress={() => nav.navigate('Rooms')} activeOpacity={0.85}>
              <View style={s.smallCardInner}>
                <View>
                  <Text style={s.smallCardTitle}>{t('roomsPG')}</Text>
                  <Text style={s.smallCardSub}>{roomCount} {t('listings')}</Text>
                </View>
                <View style={[s.smallCardIcon, { backgroundColor: '#f0f4ff' }]}>
                  <Ionicons name="business" size={20} color="#6366f1" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.wideCard} onPress={() => nav.navigate('BuySell')} activeOpacity={0.85}>
          <View style={[s.smallCardIcon, { backgroundColor: '#fdf0ff' }]}>
            <Ionicons name="pricetag" size={22} color="#9333ea" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.wideCardTitle}>{t('buySell')}</Text>
            <Text style={s.wideCardSub}>
              {lang === 'en' ? 'Furniture, Electronics, Hobby'
               : lang === 'mr' ? 'फर्निचर, इलेक्ट्रॉनिक्स, छंद'
               : 'फर्नीचर, इलेक्ट्रॉनिक्स, शौक'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9333ea" />
        </TouchableOpacity>

      </View>

      {/* ── Recent Jobs (improved) ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{t('recentJobs')}</Text>
        <TouchableOpacity onPress={() => nav.navigate('Jobs')}>
          <Text style={s.seeAllBtn}>See all →</Text>
        </TouchableOpacity>
      </View>

      {displayJobs.map(job => (
        <RecentJobCard
          key={job.id || job.title}
          job={job}
          onPress={() =>
            job.status === 'active'
              ? nav.navigate('JobDetail', { job })
              : nav.navigate('Jobs')
          }
        />
      ))}

      <TouchableOpacity onPress={() => nav.navigate('Jobs')} style={s.viewAll}>
        <Text style={s.viewAllTxt}>{t('viewAllJobs')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBand: { backgroundColor: '#111111', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandText: { fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  brandNanded: { color: '#ffffff' },
  brandRozgar: { color: '#f97316' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  profileBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-end', backgroundColor: '#1e1e1e', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: '#f97316' },
  langToggleTxt: { color: '#f97316', fontSize: 12, fontWeight: '700' },
  // AI Card
  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#f97316', padding: 14, shadowColor: ORANGE, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  aiLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 3 },
  aiPrompt: { fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 16 },
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  seeAllBtn: { fontSize: 12, fontWeight: '700', color: ORANGE },
  // Grid
  grid: { paddingHorizontal: 12, gap: 10, marginBottom: 4 },
  gridTopRow: { flexDirection: 'row', gap: 10, height: 180 },
  featuredCard: { flex: 1, backgroundColor: '#ffedd5', borderRadius: 16, overflow: 'hidden', padding: 14, justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  featuredWatermark: { position: 'absolute', bottom: -10, right: -10 },
  featuredContent: { flex: 1, justifyContent: 'flex-end', gap: 6 },
  featuredIconWrap: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  featuredTitle: { fontSize: 17, fontWeight: '800', color: '#c2410c' },
  featuredSub: { fontSize: 12, color: '#ea580c', fontWeight: '500' },
  gridRightCol: { flex: 1, gap: 10 },
  smallCard: { flex: 1, backgroundColor: '#e8eeff', borderRadius: 14, padding: 14, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  smallCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallCardTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  smallCardSub: { fontSize: 11, color: '#555' },
  smallCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wideCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f5f5f5', borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0', padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  wideCardTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  wideCardSub: { fontSize: 11, color: '#777', marginTop: 2 },
  // Recent job cards (improved)
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  jobCardFeatured: { borderLeftWidth: 3, borderLeftColor: ORANGE },
  jobCardUrgent:   { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  jobFeatBadge: {
    position: 'absolute', top: 0, right: 12,
    backgroundColor: ORANGE,
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    paddingVertical: 2, paddingHorizontal: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3, zIndex: 10,
  },
  jobFeatTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  jobRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobThumb: { width: 44, height: 44, borderRadius: 11, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  jobSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobSub: { fontSize: 11, color: '#777' },
  jobChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  jobLocChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  jobLocTxt: { fontSize: 10, color: '#666', fontWeight: '500' },
  jobExpChip: { backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#bbf7d0' },
  jobExpTxt: { fontSize: 10, color: '#15803d', fontWeight: '600' },
  jobSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  jobSkillTag: { backgroundColor: '#f8f8f8', borderWidth: 0.5, borderColor: '#e5e5e5', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  jobSkillTxt: { fontSize: 9, color: '#666', fontWeight: '500' },
  salaryCol: { alignItems: 'flex-end', flexShrink: 0 },
  priceBadge: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  freshnessDot: { width: 5, height: 5, borderRadius: 3 },
  jobTime: { fontSize: 10, color: '#bbb', fontWeight: '500' },
  viewAll: { marginHorizontal: 12, marginTop: 4, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 13, color: '#f97316', fontWeight: '700' },
});

// ── Lang modal styles ─────────────────────────────────────────────────────────
const lm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  title: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: 'transparent' },
  rowActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  native: { fontSize: 17, fontWeight: '700', color: '#111', minWidth: 60 },
  nativeActive: { color: ORANGE },
  label: { fontSize: 13, color: '#888', fontWeight: '500' },
});
