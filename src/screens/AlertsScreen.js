import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Switch, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { http } from '../utils/api';
import { getPushToken } from '../utils/notifications';

const ORANGE = '#f97316';

const CATEGORIES = [
  { label: 'Driver',        icon: 'car-outline' },
  { label: 'Security',      icon: 'shield-outline' },
  { label: 'Delivery',      icon: 'bicycle-outline' },
  { label: 'Teacher',       icon: 'school-outline' },
  { label: 'Nurse',         icon: 'medkit-outline' },
  { label: 'Tailor',        icon: 'cut-outline' },
  { label: 'Electrician',   icon: 'flash-outline' },
  { label: 'Plumber',       icon: 'hammer-outline' },
  { label: 'Cook',          icon: 'restaurant-outline' },
  { label: 'Salesperson',   icon: 'storefront-outline' },
  { label: 'Accountant',    icon: 'calculator-outline' },
  { label: 'Computer',      icon: 'laptop-outline' },
  { label: 'Construction',  icon: 'construct-outline' },
  { label: 'Cleaning',      icon: 'sparkles-outline' },
];

export default function AlertsScreen() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    const r = await http('GET', '/api/alerts');
    if (r?.ok) setAlerts(r.alerts || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  function isActive(category) {
    return alerts.some(a => a.category === category && a.active);
  }

  function alertId(category) {
    return alerts.find(a => a.category === category)?.id;
  }

  async function toggle(category) {
    setSaving(category);
    const id = alertId(category);

    if (id && isActive(category)) {
      // Deactivate — toggle off
      const r = await http('PATCH', `/api/alerts/${id}/toggle`);
      if (r?.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? r.alert : a));
        Toast.show({ type: 'success', text1: `🔕 Alert off for ${category}` });
      }
    } else if (id) {
      // Re-activate
      const r = await http('PATCH', `/api/alerts/${id}/toggle`);
      if (r?.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? r.alert : a));
        Toast.show({ type: 'success', text1: `🔔 Alert on for ${category}` });
      }
    } else {
      // Create new alert
      let pushToken = null;
      try { pushToken = await getPushToken(); } catch {}
      const r = await http('POST', '/api/alerts', { category, pushToken });
      if (r?.ok) {
        setAlerts(prev => [...prev, r.alert]);
        Toast.show({ type: 'success', text1: `🔔 You'll be notified for ${category} jobs!` });
      }
    }
    setSaving(null);
  }

  async function deleteAlert(id) {
    await http('DELETE', `/api/alerts/${id}`);
    setAlerts(prev => prev.filter(a => a.id !== id));
    Toast.show({ type: 'success', text1: 'Alert removed' });
  }

  const activeCount = alerts.filter(a => a.active).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ORANGE} />}
    >
      {/* Info banner */}
      <View style={styles.banner}>
        <Ionicons name="notifications" size={22} color={ORANGE} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Job Alert Notifications</Text>
          <Text style={styles.bannerSub}>
            {activeCount > 0
              ? `You have ${activeCount} active alert${activeCount > 1 ? 's' : ''}. We'll notify you when new matching jobs are posted.`
              : 'Tap a category below to get notified when new jobs are posted.'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {CATEGORIES.map(cat => {
            const active = isActive(cat.label);
            const isSaving = saving === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.catCard, active && styles.catCardActive]}
                onPress={() => toggle(cat.label)}
                activeOpacity={0.8}
                disabled={!!isSaving}
              >
                <View style={[styles.catIcon, active && styles.catIconActive]}>
                  {isSaving
                    ? <ActivityIndicator color={active ? '#fff' : ORANGE} size="small" />
                    : <Ionicons name={cat.icon} size={22} color={active ? '#fff' : ORANGE} />
                  }
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
                {active && (
                  <View style={styles.activeIndicator}>
                    <Ionicons name="checkmark-circle" size={14} color={ORANGE} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Active alerts list */}
      {alerts.filter(a => a.active).length > 0 && (
        <View style={styles.activeSection}>
          <Text style={styles.activeSectionTitle}>ACTIVE ALERTS</Text>
          {alerts.filter(a => a.active).map(alert => (
            <View key={alert.id} style={styles.alertRow}>
              <Ionicons name="notifications" size={16} color={ORANGE} />
              <Text style={styles.alertLabel}>{alert.category}</Text>
              {alert.keywords && <Text style={styles.alertKeywords}>"{alert.keywords}"</Text>}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => deleteAlert(alert.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f5f5' },
  banner:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fff7ed', margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 3 },
  bannerSub:   { fontSize: 12, color: '#666', lineHeight: 17 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  catCard:     { width: '30%', flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#ebebeb', position: 'relative' },
  catCardActive:{ borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  catIcon:     { width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  catIconActive:{ backgroundColor: ORANGE },
  catLabel:    { fontSize: 11, fontWeight: '700', color: '#666', textAlign: 'center' },
  catLabelActive:{ color: ORANGE },
  activeIndicator:{ position: 'absolute', top: 6, right: 6 },
  activeSection:{ margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ebebeb' },
  activeSectionTitle:{ fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 12 },
  alertRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  alertLabel:  { fontSize: 13, fontWeight: '700', color: '#111' },
  alertKeywords:{ fontSize: 12, color: '#888', flex: 1 },
});
