import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#f97316';
const CATEGORIES = ['Driver','Security','Delivery','Teacher','Nurse','Tailor','Electrician','Plumber','Cook','Salesperson','Accountant','Computer','Construction','Cleaning','Other'];

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <TextInput
      style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor="#bbb"
      multiline={multiline} keyboardType={keyboardType || 'default'}
    />
  );
}

export default function SeekerProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio]           = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills]     = useState([]);
  const [experience, setExperience] = useState('');
  const [education, setEducation]   = useState('');
  const [location, setLocation]     = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [openToWork, setOpenToWork] = useState(true);
  const [resumeUrl, setResumeUrl]   = useState(null);
  const [resumeName, setResumeName] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    http('GET', '/api/seeker/profile').then(r => {
      if (r?.ok && r.profile) {
        const p = r.profile;
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setSkills(Array.isArray(p.skills) ? p.skills : []);
        setExperience(p.experience || '');
        setEducation(p.education || '');
        setLocation(p.location || '');
        setExpectedSalary(p.expected_salary || '');
        setOpenToWork(p.open_to_work !== false);
        setResumeUrl(p.resume_url || null);
        setResumeName(p.resume_url ? 'resume.pdf' : null);
      }
      setLoading(false);
    });
  }, []);

  function addSkill(sk) {
    const clean = sk.trim();
    if (clean && !skills.includes(clean)) setSkills(prev => [...prev, clean]);
    setSkillInput('');
  }

  function removeSkill(sk) { setSkills(prev => prev.filter(s => s !== sk)); }

  async function pickResume() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large (max 5 MB)' });
        return;
      }
      setUploadingResume(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const r = await http('POST', '/api/seeker/resume', {
        resumeBase64: base64,
        fileName: asset.name || 'resume.pdf',
      });
      setUploadingResume(false);
      if (r?.ok) {
        setResumeUrl(r.resumeUrl);
        setResumeName(asset.name || 'resume.pdf');
        Toast.show({ type: 'success', text1: '📄 Resume uploaded!' });
      } else {
        Toast.show({ type: 'error', text1: r?.error || 'Upload failed' });
      }
    } catch (e) {
      setUploadingResume(false);
      Toast.show({ type: 'error', text1: 'Could not pick file' });
    }
  }

  async function removeResume() {
    setUploadingResume(true);
    const r = await http('DELETE', '/api/seeker/resume');
    setUploadingResume(false);
    if (r?.ok) {
      setResumeUrl(null);
      setResumeName(null);
      Toast.show({ type: 'success', text1: 'Resume removed' });
    }
  }

  async function save() {
    setSaving(true);
    const r = await http('PUT', '/api/seeker/profile', {
      headline, bio, skills, experience, education,
      location, expectedSalary, openToWork,
    });
    setSaving(false);
    if (r?.ok) {
      Toast.show({ type: 'success', text1: '✅ Profile saved!' });
    } else {
      Toast.show({ type: 'error', text1: r?.error || 'Save failed' });
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={ORANGE} size="large" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={[styles.openBadge, !openToWork && styles.closedBadge]}>
            <View style={[styles.dot, !openToWork && { backgroundColor: '#aaa' }]} />
            <Text style={[styles.openTxt, !openToWork && { color: '#aaa' }]}>
              {openToWork ? 'Open to Work' : 'Not Looking'}
            </Text>
          </View>
        </View>
        <Switch
          value={openToWork}
          onValueChange={setOpenToWork}
          trackColor={{ false: '#ddd', true: '#fed7aa' }}
          thumbColor={openToWork ? ORANGE : '#aaa'}
        />
      </View>

      {/* Headline */}
      <Field label="Professional Headline">
        <Input value={headline} onChangeText={setHeadline} placeholder="e.g. Experienced Driver · 5 years in Nanded" />
      </Field>

      {/* Bio */}
      <Field label="About Me">
        <Input value={bio} onChangeText={setBio} placeholder="Tell employers a bit about yourself…" multiline />
      </Field>

      {/* Skills */}
      <Field label="Skills">
        <View style={styles.skillInput}>
          <TextInput
            style={styles.skillTextInput}
            value={skillInput}
            onChangeText={setSkillInput}
            placeholder="Type a skill and press Add"
            placeholderTextColor="#bbb"
            onSubmitEditing={() => addSkill(skillInput)}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => addSkill(skillInput)}>
            <Text style={styles.addBtnTxt}>Add</Text>
          </TouchableOpacity>
        </View>
        {/* Quick add chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {CATEGORIES.filter(c => !skills.includes(c)).slice(0, 8).map(c => (
              <TouchableOpacity key={c} style={styles.quickChip} onPress={() => addSkill(c)}>
                <Text style={styles.quickChipTxt}>+ {c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {skills.length > 0 && (
          <View style={styles.skillsWrap}>
            {skills.map(sk => (
              <TouchableOpacity key={sk} style={styles.skillChip} onPress={() => removeSkill(sk)}>
                <Text style={styles.skillChipTxt}>{sk}</Text>
                <Ionicons name="close" size={12} color={ORANGE} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Field>

      {/* Experience */}
      <Field label="Years of Experience">
        <Input value={experience} onChangeText={setExperience} placeholder="e.g. 3 years" />
      </Field>

      {/* Education */}
      <Field label="Highest Education">
        <Input value={education} onChangeText={setEducation} placeholder="e.g. 12th Pass, ITI, Graduate" />
      </Field>

      {/* Location */}
      <Field label="Preferred Work Location">
        <Input value={location} onChangeText={setLocation} placeholder="e.g. Nanded City, Vazirabad" />
      </Field>

      {/* Expected Salary */}
      <Field label="Expected Salary">
        <Input value={expectedSalary} onChangeText={setExpectedSalary} placeholder="e.g. ₹12,000/month" />
      </Field>

      {/* Resume Upload */}
      <Field label="Resume / CV (PDF)">
        {resumeUrl ? (
          <View style={styles.resumeBox}>
            <View style={styles.resumeFile}>
              <Ionicons name="document-text" size={22} color={ORANGE} />
              <Text style={styles.resumeFileName} numberOfLines={1}>{resumeName || 'resume.pdf'}</Text>
            </View>
            <TouchableOpacity style={styles.resumeRemoveBtn} onPress={removeResume} disabled={uploadingResume}>
              {uploadingResume
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Ionicons name="trash-outline" size={18} color="#ef4444" />
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.resumeUploadBtn} onPress={pickResume} disabled={uploadingResume} activeOpacity={0.8}>
            {uploadingResume ? (
              <ActivityIndicator size="small" color={ORANGE} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={ORANGE} />
                <Text style={styles.resumeUploadTxt}>Upload PDF Resume</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.resumeHint}>Employers can download your resume when they view your profile</Text>
      </Field>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.saveTxt}>Save Profile</Text></>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ebebeb' },
  avatar:    { width: 52, height: 52, borderRadius: 26, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userName:  { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ecfdf5', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, alignSelf: 'flex-start' },
  closedBadge: { backgroundColor: '#f5f5f5' },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  openTxt:   { fontSize: 11, fontWeight: '600', color: '#10b981' },
  field:     { marginBottom: 14 },
  fieldLabel:{ fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10, padding: 12, fontSize: 13, color: '#111' },
  skillInput:{ flexDirection: 'row', gap: 8 },
  skillTextInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10, padding: 12, fontSize: 13, color: '#111' },
  addBtn:    { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  quickChip: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  quickChipTxt: { fontSize: 12, color: ORANGE, fontWeight: '600' },
  skillsWrap:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  skillChipTxt: { fontSize: 12, color: ORANGE, fontWeight: '600' },
  saveBtn:   { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveTxt:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  resumeUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 10, borderStyle: 'dashed', padding: 14, justifyContent: 'center', backgroundColor: '#fff7ed' },
  resumeUploadTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },
  resumeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 10, padding: 12, gap: 10 },
  resumeFile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resumeFileName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111' },
  resumeRemoveBtn: { padding: 4 },
  resumeHint: { fontSize: 11, color: '#aaa', marginTop: 6 },
});
