import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../../src/context/NotificationContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { notificationTarget, notificationKind } from '../../../src/services/notificationLinks';
import { PREFS, loadPrefs, savePref } from '../../../src/services/notificationPrefs';

/** C13: the customer's notification settings, shared with the web. */
function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => { loadPrefs().then(setPrefs).catch(() => setPrefs(null)); }, []);
  if (!prefs) return null;
  const toggle = async (key) => {
    const before = prefs;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    try {
      const saved = await savePref(key, !before[key]);
      if (saved) setPrefs(saved);
    } catch {
      setPrefs(before);
    }
  };
  return (
    <View style={styles.settings}>
      <Text style={styles.settingsTitle}>What reaches you</Text>
      {PREFS.map((p) => (
        <View key={p.key} style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>{p.label}</Text>
            <Text style={styles.settingHint}>{p.hint}</Text>
          </View>
          <Switch value={Boolean(prefs[p.key])} onValueChange={() => toggle(p.key)} accessibilityLabel={p.label} />
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllRead, refreshNotifications, unreadCount } = useNotifications();
  const { t } = useLanguage();

  const getIconForType = (type) => {
    switch (notificationKind(type)) {
      case 'order': return 'cube-outline';
      case 'community': return 'people-outline';
      case 'promotion': return 'pricetag-outline';
      default: return 'notifications-outline';
    }
  };

  const getColorForType = (type) => {
    switch (notificationKind(type)) {
      case 'order': return '#3b82f6';
      case 'community': return '#10b981';
      case 'promotion': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => {
        if (!item.isRead) markAsRead(item.id);
        // C13: open what the notification is about (an order, a shop, support).
        const target = notificationTarget(item);
        if (target) router.push(target);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: getColorForType(item.type) + '20' }]}>
        <Ionicons name={getIconForType(item.type)} size={24} color={getColorForType(item.type)} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      </View>
      
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>You're all caught up!</Text>
          <NotificationSettings />
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isLoading}
          onRefresh={refreshNotifications}
          ListFooterComponent={<NotificationSettings />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settings: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  settingsTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, minHeight: 48 },
  settingLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  settingHint: { fontSize: 12, color: '#6b7280' },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  markAllText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  unreadText: {
    color: '#111827',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  }
});
