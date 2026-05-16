import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#f97316';

export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const insets = useSafeAreaInsets();

  function callOwner() { Linking.openURL(`tel:${room.phone}`); }
  function whatsapp() {
    const msg = encodeURIComponent(`Hi, I saw your room listing on NandedRozgar: ${room.title}. Is it still available?`);
    Linking.openURL(`https://wa.me/91${room.phone}?text=${msg}`);
  }
  async function share() {
    try { await Share.share({ message: `Room for Rent: ${room.title}\n${room.location} | ${room.rent}\n\nFind on NandedRozgar!` }); } catch {}
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header Image */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Ionicons name="home-outline" size={48} color="rgba(255,255,255,0.3)" />
        </View>
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        {room.available && (
          <View style={styles.availBadge}>
            <Text style={styles.availTxt}>Available</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Title Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{room.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={13} color="#888" />
                <Text style={styles.location}>{room.location}</Text>
                <View style={styles.typeBadge}><Text style={styles.typeTxt}>{room.type}</Text></View>
              </View>
            </View>
            <Text style={styles.rent}>{room.rent}</Text>
          </View>
        </View>

        {/* Description */}
        {!!room.description && (
          <View style={styles.card}>
            <Text style={styles.sectionHead}>About this Place</Text>
            <Text style={styles.desc}>{room.description}</Text>
          </View>
        )}

        {/* Contact */}
        {!!room.phone && (
          <View style={styles.card}>
            <Text style={styles.sectionHead}>Contact Owner</Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={18} color={ORANGE} />
              <Text style={styles.phone}>{room.phone}</Text>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: ORANGE }]} onPress={callOwner}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.btnTxt}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#25d366' }]} onPress={whatsapp}>
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.btnTxt}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Share */}
        <TouchableOpacity style={styles.shareRow} onPress={share}>
          <Ionicons name="share-social-outline" size={16} color="#555" />
          <Text style={styles.shareTxt}>Share this listing</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroContent: { alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  availBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#16a34a', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  availTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ebebeb' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  location: { fontSize: 13, color: '#888' },
  typeBadge: { backgroundColor: '#eff6ff', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  typeTxt: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  rent: { fontSize: 18, fontWeight: '800', color: ORANGE },
  sectionHead: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  desc: { fontSize: 14, lineHeight: 22, color: '#333' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  phone: { fontSize: 18, fontWeight: '800', color: '#111' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  shareTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
});
