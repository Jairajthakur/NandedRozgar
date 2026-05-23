import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#f97316';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const [convos, setConvos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const r = await http('GET', '/api/chat/conversations');
      if (r?.ok) setConvos(r.conversations || []);
    } finally {
      if (!refresh) setLoading(false);
      setRefreshing(false);
    }
  }

  // Reload whenever screen is focused so unread counts are fresh
  useFocusEffect(useCallback(() => { load(); }, []));

  function openChat(convo) {
    navigation.navigate('Chat', {
      otherId:   convo.other_id,
      otherName: convo.other_name,
      jobId:     convo.job_id,
      jobTitle:  convo.job_title,
    });
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={ORANGE} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={convos}
        keyExtractor={(item, i) => `${item.other_id}-${item.job_id}-${i}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ORANGE} />}
        contentContainerStyle={convos.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color="#ddd" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>When you or an employer starts a chat via a job listing, it will appear here</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const unread = parseInt(item.unread || 0) > 0;
          return (
            <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.8}>
              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{item.other_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, unread && styles.nameUnread]}>{item.other_name}</Text>
                  <Text style={styles.time}>{timeAgo(item.last_at)}</Text>
                </View>
                {item.job_title && (
                  <Text style={styles.jobTitle} numberOfLines={1}>re: {item.job_title}</Text>
                )}
                <Text style={[styles.lastMsg, unread && styles.lastMsgUnread]} numberOfLines={1}>
                  {item.last_message || 'Start the conversation…'}
                </Text>
              </View>
              {unread && <View style={styles.unreadDot}><Text style={styles.unreadNum}>{item.unread}</Text></View>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer:  { flex: 1, justifyContent: 'center' },
  empty:           { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle:      { fontSize: 16, fontWeight: '700', color: '#aaa' },
  emptySub:        { fontSize: 12, color: '#ccc', textAlign: 'center', lineHeight: 18 },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  avatar:          { width: 48, height: 48, borderRadius: 24, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:       { fontSize: 18, fontWeight: '800', color: '#fff' },
  rowContent:      { flex: 1 },
  rowTop:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  name:            { fontSize: 14, fontWeight: '600', color: '#111' },
  nameUnread:      { fontWeight: '800' },
  time:            { fontSize: 11, color: '#bbb' },
  jobTitle:        { fontSize: 11, color: ORANGE, fontWeight: '600', marginBottom: 2 },
  lastMsg:         { fontSize: 13, color: '#888' },
  lastMsgUnread:   { color: '#333', fontWeight: '600' },
  unreadDot:       { width: 20, height: 20, borderRadius: 10, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  unreadNum:       { fontSize: 10, color: '#fff', fontWeight: '800' },
});
