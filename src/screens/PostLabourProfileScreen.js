/**
 * PostLabourProfileScreen.js — "Post your labour profile" form
 *
 * Lets a worker create (or update) their own entry in the Labour directory
 * so contractors can find and hire them. Posts to POST /api/labour, which
 * inserts a new row the first time and updates the existing one after that
 * (the backend keys off the logged-in user's id).
 *
 * Place at: src/screens/PostLabourProfileScreen.js
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  Animated, Easing, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

import { http } from '../utils/api';
import { uriToBase64DataUri } from '../utils/imageUtils';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { LABOUR_COLORS } from '../constants/labourTheme';
import { SectionCard, StepHeader } from '../components/labour/LabourUI';
import VoicePostAssistant from '../components/VoicePostAssistant';

const ORANGE = LABOUR_COLORS.primary;
const LABOUR_COLOR = LABOUR_COLORS.worker;
const IS_WEB = Platform.OS === 'web';

const SKILLS = [
  { label: 'Mason',       icon: 'construct-outline' },
  { label: 'Electrician', icon: 'flash-outline' },
  { label: 'Plumber',     icon: 'water-outline' },
  { label: 'Painter',     icon: 'color-palette-outline' },
  { label: 'Carpenter',   icon: 'hammer-outline' },
  { label: 'Welder',      icon: 'flame-outline' },
  { label: 'Helper',      icon: 'people-outline' },
  { label: 'Other',       icon: 'apps-outline' },
];

const AVAILABILITY = [
  { value: 'available', label: 'Available now',   color: '#16a34a' },
  { value: 'busy',       label: 'Busy this week', color: '#d97706' },
];

const PROFILE_TYPES = [
  { value: 'individual', label: 'Individual', icon: 'person-outline', sub: 'Just me' },
  { value: 'team',       label: 'Team',       icon: 'people-outline', sub: 'I lead a group' },
];

// ── Small fade+slide wrapper, matches the pattern used across Post screens ────
function FadeSlide({ children, delay = 0, style }) {
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(y, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: o, transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

export default function PostLabourProfileScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { district } = useDistrict();

  const [fullName, setFullName]   = useState(user?.name || '');
  const [phone, setPhone]         = useState(user?.phone || '');
  const [skill, setSkill]         = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [experience, setExperience] = useState('');
  const [wage, setWage]           = useState('');
  const [profileType, setProfileType] = useState('individual');
  const [teamSize, setTeamSize]       = useState('');
  const [teamComposition, setTeamComposition] = useState('');
  const isTeam = profileType === 'team';
  const [location, setLocation]   = useState('');
  const [bio, setBio]             = useState('');
  const [availability, setAvailability] = useState('available');
  const [photoUri, setPhotoUri]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [wageBoard, setWageBoard] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  // New profiles start with just the voice assistant showing — the typed
  // form only appears once voice has filled something, or the person taps
  // "Fill in manually instead". Editing an existing profile always shows
  // the full form immediately, since there's already real data to review.
  const [formExpanded, setFormExpanded] = useState(false);

  // If the user already has a profile, load it so editing doesn't blank out
  // fields (skill, wage, bio, etc.) they'd filled in previously.
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await http('GET', '/api/labour/mine');
      if (!alive) return;
      if (res?.ok && res.profile) {
        const p = res.profile;
        setIsEditing(true);
        setFormExpanded(true);
        setFullName(p.full_name || user?.name || '');
        setPhone(user?.phone || '');
        setSkill(p.skill_category || null);
        setSkillsText(Array.isArray(p.skills) ? p.skills.join(', ') : '');
        setExperience(p.experience_years != null ? String(p.experience_years) : '');
        setWage(p.daily_wage != null ? String(p.daily_wage) : '');
        setProfileType(p.profile_type || 'individual');
        setTeamSize(p.team_size != null ? String(p.team_size) : '');
        setTeamComposition(p.team_composition || '');
        setLocation(p.location || '');
        setBio(p.bio || '');
        setAvailability(p.availability || 'available');
        if (p.photo_url) setPhotoUri(p.photo_url);
      }
      setLoadingProfile(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const params = new URLSearchParams();
      if (district) params.set('district', district);
      const res = await http('GET', `/api/labour/wage-board?${params.toString()}`);
      if (alive && res?.ok) setWageBoard(res.rates || []);
    })();
    return () => { alive = false; };
  }, [district]);

  const goingRate = skill ? wageBoard.find(r => r.skill_category === skill) : null;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your name' });
      return;
    }
    if (!skill) {
      Toast.show({ type: 'error', text1: 'Select your main skill' });
      return;
    }
    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      Toast.show({ type: 'error', text1: 'Enter a valid 10-digit contact number', text2: 'Contractors need this to reach you.' });
      return;
    }
    const parsedTeamSize = parseInt(teamSize, 10);
    if (isTeam && (!parsedTeamSize || parsedTeamSize < 2)) {
      Toast.show({ type: 'error', text1: 'Enter your team headcount', text2: 'A team needs at least 2 people — otherwise post as an individual.' });
      return;
    }

    setSubmitting(true);
    try {
      let photo_url = null;
      if (photoUri) photo_url = await uriToBase64DataUri(photoUri);

      const skills = skillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await http('POST', '/api/labour', {
        full_name: fullName.trim(),
        phone: cleanedPhone,
        skill_category: skill,
        skills,
        experience_years: experience ? parseInt(experience, 10) : null,
        daily_wage: wage ? parseInt(wage, 10) : null,
        district: district || 'nanded',
        location: location.trim() || null,
        bio: bio.trim() || null,
        photo_url,
        profile_type: profileType,
        team_size: isTeam ? parsedTeamSize : null,
        team_composition: isTeam ? teamComposition.trim() || null : null,
      });

      if (res?.ok) {
        Toast.show({ type: 'success', text1: 'Profile posted!', text2: 'Contractors in your area can now find you.' });
        // So the Labour tab routes straight to the worker dashboard next
        // time, without waiting on a full /api/auth/me round trip.
        updateUser({ has_labour_profile: true });
        if (res.profile?.id) nav.replace('LabourDetail', { id: res.profile.id });
        else nav.goBack();
      } else if (res?.status === 401) {
        Alert.alert('Login required', 'Please log in to post your labour profile.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log in', onPress: () => nav.navigate('Login') },
        ]);
      } else {
        Toast.show({ type: 'error', text1: 'Could not save profile', text2: res?.error || 'Please try again.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: IS_WEB ? 0 : insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{isEditing ? 'Edit your profile' : 'Post your profile'}</Text>
        <View style={s.backBtn} />
      </View>

      {loadingProfile ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={LABOUR_COLOR} />
        </View>
      ) : (
      <>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeSlide delay={40} style={s.heroCard}>
            <Text style={s.heroEyebrow}>LABOUR DIRECTORY</Text>
            <Text style={s.heroTitle}>{isEditing ? 'Keep your listing fresh' : 'Get hired faster'}</Text>
            <Text style={s.heroSub}>
              {isEditing
                ? 'Update your rate, availability, or details — changes go live right away.'
                : 'List your skills, daily wage & availability — contractors nearby can find and hire you directly.'}
            </Text>
          </FadeSlide>

          {/* ── Voice Post Assistant — speak your profile instead of typing ──── */}
          <FadeSlide delay={70}>
            <VoicePostAssistant
              screenType="labour"
              onFill={(fields) => {
                const {
                  fullName: vName, skillCategory: vSkill, otherSkills: vOtherSkills,
                  experienceYears: vExp, dailyWage: vWage, location: vLoc,
                  availability: vAvail, isTeam: vIsTeam, teamSize: vTeamSize, bio: vBio,
                } = fields;

                if (vName) setFullName(vName);
                if (vSkill) {
                  const match = SKILLS.find(sk => sk.label.toLowerCase() === String(vSkill).toLowerCase());
                  setSkill(match ? match.label : vSkill);
                }
                if (Array.isArray(vOtherSkills) && vOtherSkills.length > 0) {
                  setSkillsText(vOtherSkills.join(', '));
                }
                if (vExp) setExperience(String(vExp).replace(/[^\d]/g, ''));
                if (vWage) setWage(String(vWage).replace(/[^\d]/g, ''));
                if (vLoc) setLocation(vLoc);
                if (vAvail === 'available' || vAvail === 'busy') setAvailability(vAvail);
                if (vIsTeam === true || vIsTeam === 'true') {
                  setProfileType('team');
                  if (vTeamSize) setTeamSize(String(vTeamSize).replace(/[^\d]/g, ''));
                }
                if (vBio) setBio(vBio);

                setFormExpanded(true);
                Toast.show({ type: 'success', text1: 'Filled from your voice', text2: 'Check the fields below and edit anything that needs fixing.' });
              }}
            />
          </FadeSlide>

          {!formExpanded && (
            <FadeSlide delay={90}>
              <TouchableOpacity
                style={s.manualFallback}
                activeOpacity={0.8}
                onPress={() => setFormExpanded(true)}
              >
                <Ionicons name="create-outline" size={16} color={LABOUR_COLOR} />
                <Text style={s.manualFallbackTxt}>Fill in manually instead</Text>
              </TouchableOpacity>
            </FadeSlide>
          )}

          {formExpanded && (
          <>
          {/* ── Step 1 — Basic details: photo, who this profile is for, name ── */}
          <FadeSlide delay={90}>
            <SectionCard>
              <StepHeader number={1} title="Basic details" subtitle="How employers will identify you" />

              <View style={s.field}>
                <TouchableOpacity style={s.photoPicker} onPress={pickPhoto} activeOpacity={0.85}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={s.photoImg} />
                  ) : (
                    <View style={s.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={22} color={LABOUR_COLOR} />
                    </View>
                  )}
                  <Text style={s.photoLabel}>{photoUri ? 'Change photo' : 'Add a profile photo'}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Who's this profile for?</Text>
                <View style={s.row}>
                  {PROFILE_TYPES.map(pt => {
                    const active = profileType === pt.value;
                    return (
                      <TouchableOpacity
                        key={pt.value}
                        onPress={() => setProfileType(pt.value)}
                        style={[s.typeCard, active && s.typeCardActive]}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={pt.icon} size={18} color={active ? '#fff' : LABOUR_COLOR} />
                        <Text style={[s.typeCardLabel, active && s.typeCardLabelActive]}>{pt.label}</Text>
                        <Text style={[s.typeCardSub, active && s.typeCardSubActive]}>{pt.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {isTeam && (
                  <Text style={s.hint}>
                    You'll be the point of contact. Contractors will hire the whole crew through you.
                  </Text>
                )}
              </View>

              <View style={s.field}>
                <Text style={s.label}>{isTeam ? 'Team name / lead worker name *' : 'Full name *'}</Text>
                <TextInput
                  style={s.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={isTeam ? "e.g. Ramesh's Mason Team" : 'e.g. Ramesh Patil'}
                  placeholderTextColor="#bbb"
                />
              </View>

              {isTeam && (
                <View style={[s.field, s.row]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Team size *</Text>
                    <TextInput
                      style={s.input}
                      value={teamSize}
                      onChangeText={setTeamSize}
                      placeholder="e.g. 5"
                      placeholderTextColor="#bbb"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Text style={s.label}>Team composition</Text>
                    <TextInput
                      style={s.input}
                      value={teamComposition}
                      onChangeText={setTeamComposition}
                      placeholder="e.g. 3 masons + 2 helpers"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
              )}
            </SectionCard>
          </FadeSlide>

          {/* ── Step 2 — Contact & trade: phone, skill, other skills ────────── */}
          <FadeSlide delay={150}>
            <SectionCard>
              <StepHeader number={2} title="Contact & trade" subtitle="How and for what you'll get hired" />

              <View style={s.field}>
                <Text style={s.label}>Contact number *</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={s.hint}>Contractors can unlock this number for free, so it must be correct — this is how they'll reach you.</Text>
              </View>

              <View style={s.field}>
                <Text style={s.label}>{isTeam ? "Team's main trade *" : 'Main skill *'}</Text>
                <View style={s.skillGrid}>
                  {SKILLS.map(sk => {
                    const active = skill === sk.label;
                    return (
                      <TouchableOpacity
                        key={sk.label}
                        onPress={() => setSkill(sk.label)}
                        style={[s.skillChip, active && s.skillChipActive]}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={sk.icon} size={14} color={active ? '#fff' : LABOUR_COLOR} />
                        <Text style={[s.skillChipTxt, active && s.skillChipTxtActive]}>{sk.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Other skills (optional)</Text>
                <TextInput
                  style={s.input}
                  value={skillsText}
                  onChangeText={setSkillsText}
                  placeholder="e.g. Tiling, Wiring, Painting (comma separated)"
                  placeholderTextColor="#bbb"
                />
              </View>
            </SectionCard>
          </FadeSlide>

          {/* ── Step 3 — Rate & availability ─────────────────────────────────── */}
          <FadeSlide delay={210}>
            <SectionCard>
              <StepHeader number={3} title="Rate & availability" subtitle="What you charge and when you're free" />

              <View style={[s.field, s.row]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Experience (yrs)</Text>
                  <TextInput
                    style={s.input}
                    value={experience}
                    onChangeText={setExperience}
                    placeholder="e.g. 5"
                    placeholderTextColor="#bbb"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>{isTeam ? 'Combined day rate (₹)' : 'Daily wage (₹)'}</Text>
                  <TextInput
                    style={s.input}
                    value={wage}
                    onChangeText={setWage}
                    placeholder={isTeam ? 'e.g. 3000 for the crew' : 'e.g. 600'}
                    placeholderTextColor="#bbb"
                    keyboardType="number-pad"
                  />
                  {!!goingRate && !isTeam && (
                    <Text style={s.hint}>
                      Today&apos;s going rate for {skill}: ₹{goingRate.median_wage}/day ({goingRate.sample_size} listings)
                    </Text>
                  )}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Availability</Text>
                <View style={s.row}>
                  {AVAILABILITY.map(a => {
                    const active = availability === a.value;
                    return (
                      <TouchableOpacity
                        key={a.value}
                        onPress={() => setAvailability(a.value)}
                        style={[s.availPill, active && { backgroundColor: a.color + '18', borderColor: a.color }]}
                        activeOpacity={0.85}
                      >
                        <View style={[s.availDot, { backgroundColor: a.color }]} />
                        <Text style={[s.availTxt, active && { color: a.color, fontWeight: '800' }]}>{a.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </SectionCard>
          </FadeSlide>

          {/* ── Step 4 — Location & about ────────────────────────────────────── */}
          <FadeSlide delay={270}>
            <SectionCard>
              <StepHeader number={4} title="Location & about" subtitle="Help employers find and know you (optional)" />

              <View style={s.field}>
                <Text style={s.label}>Area / locality</Text>
                <TextInput
                  style={s.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Vazirabad, Nanded"
                  placeholderTextColor="#bbb"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>About you (optional)</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="A short line about your work — tools you carry, past projects, etc."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </SectionCard>
          </FadeSlide>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky submit bar */}
      <View style={[s.submitBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitBtnTxt}>{isEditing ? 'Save changes' : "Post my profile — it's free"}</Text>}
        </TouchableOpacity>
      </View>
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  manualFallback: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4,
  },
  manualFallbackTxt: { fontSize: 13.5, fontWeight: '700', color: LABOUR_COLOR },
  root: { flex: 1, backgroundColor: '#f7f7f7' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  scroll: { padding: 16, gap: 14 },

  heroCard: {
    backgroundColor: LABOUR_COLOR, borderRadius: 16, padding: 18, marginBottom: 4,
  },
  heroEyebrow: { fontSize: 10, fontWeight: '800', color: '#fde68a', letterSpacing: 1.2 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 6 },
  heroSub: { fontSize: 12, color: '#fde68a', marginTop: 6, lineHeight: 17 },

  section: { gap: 8 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },

  label: { fontSize: 12, fontWeight: '700', color: '#555' },
  hint: { fontSize: 11, color: '#999', marginTop: 6, lineHeight: 15 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#111',
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 11 },

  photoPicker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoImg: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: LABOUR_COLOR + '18',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: LABOUR_COLOR + '33', borderStyle: 'dashed',
  },
  photoLabel: { fontSize: 13, fontWeight: '700', color: LABOUR_COLOR },

  typeCard: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
  },
  typeCardActive: { backgroundColor: LABOUR_COLOR, borderColor: LABOUR_COLOR },
  typeCardLabel: { fontSize: 13, fontWeight: '800', color: '#111' },
  typeCardLabelActive: { color: '#fff' },
  typeCardSub: { fontSize: 10, fontWeight: '600', color: '#999' },
  typeCardSubActive: { color: '#fde68a' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  skillChipActive: { backgroundColor: LABOUR_COLOR, borderColor: LABOUR_COLOR },
  skillChipTxt: { fontSize: 12, fontWeight: '700', color: '#555' },
  skillChipTxtActive: { color: '#fff' },

  availPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availTxt: { fontSize: 12, fontWeight: '600', color: '#666' },

  submitBar: {
    position: IS_WEB ? 'sticky' : 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
