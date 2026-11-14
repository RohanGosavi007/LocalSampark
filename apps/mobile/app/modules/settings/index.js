import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loadConsent, setConsent, subscribe } from '../../../src/services/analyticsConsent';
import { useLanguage } from '../../../src/context/LanguageContext';

/**
 * Settings (More > Settings). The More tab has always linked here; the screen
 * did not exist, so the link opened nothing.
 *
 * Holds the privacy choice (P11): "Share usage analytics", off until the user
 * turns it on, and turning it off stops collection at once and discards what
 * was gathered. It is the same state the first-run prompt sets.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [choice, setChoice] = useState('unset');

  useEffect(() => {
    let live = true;
    loadConsent().then((c) => { if (live) setChoice(c); });
    const off = subscribe((c) => { if (live) setChoice(c); });
    return () => { live = false; off(); };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{t('settings')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{t('share_analytics')}</Text>
            <Text style={styles.hint}>
              {t('share_analytics_hint')}
            </Text>
          </View>
          <Switch
            value={choice === 'granted'}
            onValueChange={(on) => setConsent(on)}
            accessibilityLabel={t('share_analytics')}
            trackColor={{ true: '#007F4F' }}
          />
        </View>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {choice === 'granted' ? t('analytics_on') : t('analytics_off')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  back: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#111827' },
  hint: { fontSize: 13, lineHeight: 19, color: '#4B5563', marginTop: 4 },
  status: { fontSize: 13, color: '#374151', marginTop: 12 },
});
