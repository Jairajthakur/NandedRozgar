import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';
import { useLang, LANGUAGES } from '../utils/i18n';
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

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user, role } = useAuth();
  const { lang, changeLang, t } = useLang();
  const [showLangPicker, setShowLangPicker] = React.useState(false);

  // Find the current language label for the button
  const currentLang = LANGUAGES.find(l => l.code === lang);
  const langBtnLabel = currentLang?.native || 'EN';

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs.slice(0, 3);
  const carCount = CARS?.length || 0;
  const roomCount = ROOMS?.length || 0;
  const buySellCount = SAMPLE_ITEMS?.length || 0;

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

        {/* Language toggle — tapping opens picker */}
        <TouchableOpacity style={s.langToggle} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
          <Ionicons name="language" size={13} color="#f97316" />
          <Text style={s.langToggleTxt}>{langBtnLabel}</Text>
          <Ionicons name="chevron-down" size={11} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Language picker modal */}
      <LangModal
        visible={showLangPicker}
        current={lang}
        onSelect={changeLang}
        onClose={() => setShowLangPicker(false)}
      />

      {/* ── AI Prompt Card ── */}
      <AIPromptCard onPress={() => nav.navigate('AIMatch')} t={t} />

      {/* ── Services grid (LocalMarket style) ── */}
      <Text style={s.sectionTitle}>{t('ourServices')}</Text>
      <View style={s.grid}>

        {/* Top row: large featured card (Jobs) + two stacked cards */}
        <View style={s.gridTopRow}>

          {/* Featured tall card — Jobs */}
          <TouchableOpacity style={s.featuredCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            {/* Watermark icon */}
            <Ionicons name="briefcase" size={80} color="rgba(249,115,22,0.12)" style={s.featuredWatermark} />
            <View style={s.featuredContent}>
              <View style={s.featuredIconWrap}>
                <Ionicons name="briefcase" size={26} color="#f97316" />
              </View>
              <Text style={s.featuredTitle}>{t('findJobs')}</Text>
              <Text style={s.featuredSub}>{activeJobs.length} {t('opening')}</Text>
            </View>
          </TouchableOpacity>

          {/* Right column: Cars + Rooms stacked */}
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

        {/* Bottom full-width card — Buy & Sell */}
        <TouchableOpacity style={s.wideCard} onPress={() => nav.navigate('BuySell')} activeOpacity={0.85}>
          <View style={[s.smallCardIcon, { backgroundColor: '#fdf0ff' }]}>
            <Ionicons name="pricetag" size={22} color="#9333ea" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.wideCardTitle}>{t('buySell')}</Text>
            <Text style={s.wideCardSub}>{lang === 'en' ? 'Furniture, Electronics, Hobby' : lang === 'mr' ? 'फर्निचर, इलेक्ट्रॉनिक्स, छंद' : 'फर्नीचर, इलेक्ट्रॉनिक्स, शौक'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9333ea" />
        </TouchableOpacity>

      </View>



      {/* ── Recent Jobs ── */}
      <Text style={s.sectionTitle}>{t('recentJobs')}</Text>

      {recentJobs.length > 0 ? recentJobs.map(job => (
        <TouchableOpacity key={job.id} style={s.jobCard}
          onPress={() => nav.navigate('JobDetail', { job })} activeOpacity={0.85}>
          <View style={s.jobRow}>
            <View style={s.jobThumb}><Ionicons name="briefcase" size={20} color={ORANGE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              <View style={s.jobSubRow}>
                <Ionicons name="business-outline" size={11} color="#aaa" />
                <Text style={s.jobSub} numberOfLines={1}> {job.company}</Text>
              </View>
              <View style={s.jobSubRow}>
                <Ionicons name="location-outline" size={11} color="#aaa" />
                <Text style={s.jobSub}> {job.location}</Text>
              </View>
            </View>
            <View style={s.salaryCol}>
              <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
              <Text style={s.jobTime}>{t('justNow')}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )) : (
        <>
          {[
            { title: 'Telecaller',    company: 'Dhanraj Enterprises', loc: 'Nanded',       salary: '₹12,000', icon: 'call-outline' },
            { title: 'Web Developer', company: 'TechSoft Solutions',  loc: 'Nanded',       salary: '₹25,000', icon: 'globe-outline' },
            { title: 'Shop Assistant',company: 'Reliance Retail',     loc: 'Station Road', salary: '₹12,000', icon: 'storefront-outline' },
          ].map(job => (
            <TouchableOpacity key={job.title} style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
              <View style={s.jobRow}>
                <View style={s.jobThumb}><Ionicons name={job.icon} size={20} color={ORANGE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.jobTitle}>{job.title}</Text>
                  <View style={s.jobSubRow}>
                    <Ionicons name="business-outline" size={11} color="#aaa" />
                    <Text style={s.jobSub}> {job.company}</Text>
                  </View>
                  <View style={s.jobSubRow}>
                    <Ionicons name="location-outline" size={11} color="#aaa" />
                    <Text style={s.jobSub}> {job.loc}</Text>
                  </View>
                </View>
                <View style={s.salaryCol}>
                  <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
                  <Text style={s.jobTime}>{lang === 'en' ? 'Full time' : lang === 'mr' ? 'पूर्ण वेळ' : 'फुल टाइम'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

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
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  // ── Services grid (LocalMarket layout) ──
  grid: { paddingHorizontal: 12, gap: 10, marginBottom: 4 },
  gridTopRow: { flexDirection: 'row', gap: 10, height: 180 },
  // Featured tall card (Jobs)
  featuredCard: { flex: 1, backgroundColor: '#ffedd5', borderRadius: 16, overflow: 'hidden', padding: 14, justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  featuredWatermark: { position: 'absolute', bottom: -10, right: -10 },
  featuredContent: { flex: 1, justifyContent: 'flex-end', gap: 6 },
  featuredIconWrap: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  featuredTitle: { fontSize: 17, fontWeight: '800', color: '#c2410c' },
  featuredSub: { fontSize: 12, color: '#ea580c', fontWeight: '500' },
  // Right column stacked small cards
  gridRightCol: { flex: 1, gap: 10 },
  smallCard: { flex: 1, backgroundColor: '#e8eeff', borderRadius: 14, padding: 14, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  smallCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallCardTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  smallCardSub: { fontSize: 11, color: '#555' },
  smallCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // Wide full-row card (Buy & Sell / Marketplace)
  wideCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f5f5f5', borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0', padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  wideCardTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  wideCardSub: { fontSize: 11, color: '#777', marginTop: 2 },
  // Shared badge styles
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a' },
  liveTxt: { fontSize: 10, fontWeight: '700' },
  // Legacy (kept for any remaining references)
  card: { width: '47%', backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 11, color: '#888', marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 4, marginBottom: 4 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#ebebeb', paddingVertical: 10, paddingHorizontal: 12 },
  quickTxt: { fontSize: 12, fontWeight: '600', color: '#111' },
  jobCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', marginHorizontal: 12, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobThumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
  jobSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobSub: { fontSize: 11, color: '#777' },
  jobTime: { fontSize: 10, color: '#bbb', marginTop: 4, textAlign: 'right' },
  salaryCol: { alignItems: 'flex-end' },
  priceBadge: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
