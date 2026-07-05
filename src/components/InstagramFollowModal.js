/**
 * InstagramFollowModal
 * ─────────────────────────────────────────────────────────────────────────
 * A dismissible popup shown exactly ONCE EVER, right after the user's
 * first successful login (see App.js RootNavigator). Whether the user taps
 * "Follow", "Maybe Later", or the backdrop/X, the "seen" flag is persisted
 * via markInstagramBannerSeen() (src/utils/storage.js) so it never shows
 * again on this device, even after logout/login or app restarts.
 * It only resets if the user uninstalls/reinstalls the app.
 */
import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INSTAGRAM_URL } from '../utils/constants';

const ORANGE = '#f97316';

export default function InstagramFollowModal({ visible, onClose }) {
  const handleFollow = async () => {
    try {
      await Linking.openURL(INSTAGRAM_URL);
    } catch (e) {
      console.warn('[InstagramFollowModal] could not open URL:', e?.message);
    }
    onClose?.();
  };

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color="#999" />
          </TouchableOpacity>

          <View style={s.iconWrap}>
            <Ionicons name="logo-instagram" size={40} color="#fff" />
          </View>

          <Text style={s.title}>Follow us on Instagram</Text>
          <Text style={s.sub}>
            Stay updated with the latest jobs, local news and offers from CityPlus — follow @thecityplus.in
          </Text>

          <TouchableOpacity style={s.followBtn} onPress={handleFollow}>
            <Ionicons name="logo-instagram" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.followBtnTxt}>Follow Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.laterBtn} onPress={onClose}>
            <Text style={s.laterBtnTxt}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%',
    marginBottom: 10,
  },
  followBtnTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  laterBtn: {
    paddingVertical: 8,
  },
  laterBtnTxt: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
});
