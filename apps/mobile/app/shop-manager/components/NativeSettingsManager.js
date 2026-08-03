import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity , StyleSheet } from 'react-native';
import { Settings, Bell, CreditCard, Clock, Shield, AlertCircle, ChevronRight, Store } from 'lucide-react-native';
import { apiGet } from '../../../src/lib/api';
import { useAppStore } from '../../../src/store/useAppStore';

export default function NativeSettingsManager() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { shopId } = useAppStore();

  const fetchSettings = useCallback(async (isRefresh = false) => {
    if (!shopId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet(`/shops/${shopId}/settings`);
      if (data && (Array.isArray(data) || Array.isArray(data.data) || Array.isArray(data.items))) {
        // Mock reducing array of settings into key-value pairs if array is returned
        const items = data.data || data.items || data || [];
        const config = items.reduce((acc, item) => ({ ...acc, [item.key || item.setting]: item.value }), {});
        setSettings(config);
      } else if (data && typeof data === 'object') {
        setSettings(data);
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const renderSectionHeader = (title, Icon) => (
    <View style={s.s0}>
      <Icon size={16} color="#3b82f6" style={{ marginRight: 8 }} />
      <Text style={s.s1}>{title}</Text>
    </View>
  );

  const renderToggleRow = (label, description, key, defaultValue = false) => (
    <View style={s.s2}>
      <View style={s.s3}>
        <Text style={s.s4}>{label}</Text>
        <Text style={s.s5}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: '#334155', true: '#3b82f6' }}
        thumbColor="#ffffff"
        ios_backgroundColor="#334155"
        value={settings[key] !== undefined ? settings[key] === 'true' || settings[key] === true : defaultValue}
        onValueChange={(val) => setSettings(prev => ({ ...prev, [key]: val }))}
      />
    </View>
  );

  const renderActionRow = (label, value) => (
    <TouchableOpacity style={s.s6}>
      <Text style={s.s7}>{label}</Text>
      <View style={s.s8}>
        <Text style={s.s9}>{value}</Text>
        <ChevronRight size={16} color="#64748b" />
      </View>
    </TouchableOpacity>
  );

  if (!shopId && !loading) {
    return (
      <View style={s.s10}>
        <AlertCircle size={48} color="#f59e0b" />
        <Text style={s.s11}>Shop ID Missing</Text>
      </View>
    );
  }

  return (
    <View style={s.s12}>
      {loading ? (
        <View style={s.s13}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView 
          style={s.s14}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSettings(true)} tintColor="#3b82f6" />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {renderSectionHeader('Store Status', Store)}
          {renderToggleRow('Accept New Orders', 'Temporarily disable incoming orders without closing the shop.', 'accept_orders', true)}
          {renderToggleRow('Auto-Accept Orders', 'Automatically accept all incoming orders.', 'auto_accept', false)}
          
          {renderSectionHeader('Notifications', Bell)}
          {renderToggleRow('Push Notifications', 'Receive alerts for new orders and messages.', 'push_enabled', true)}
          {renderToggleRow('SMS Alerts', 'Receive critical alerts via SMS.', 'sms_enabled', false)}

          {renderSectionHeader('Operations', Clock)}
          {renderActionRow('Preparation Time', settings.prep_time || '15 mins')}
          {renderActionRow('Operating Hours', 'View/Edit')}

          {renderSectionHeader('Payments', CreditCard)}
          {renderActionRow('Payout Account', settings.payout_account ? '•••• ' + settings.payout_account.slice(-4) : 'Setup required')}
          {renderToggleRow('Cash on Delivery', 'Allow customers to pay on delivery.', 'cod_enabled', true)}

          <View style={s.s15}>
            <TouchableOpacity style={s.s16}>
              <Text style={s.s17}>Temporarily Close Shop</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  s0: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  s1: { color: '#60a5fa', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  s2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s3: { flex: 1, paddingRight: 16 },
  s4: { color: '#ffffff', fontWeight: '500', fontSize: 16, marginBottom: 4 },
  s5: { color: '#64748b', fontSize: 12, lineHeight: 1.25 },
  s6: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s7: { color: '#ffffff', fontWeight: '500', fontSize: 16 },
  s8: { flexDirection: 'row', alignItems: 'center' },
  s9: { color: '#94a3b8', fontSize: 14, marginRight: 8 },
  s10: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  s11: { color: '#ffffff', fontWeight: '700', fontSize: 18, textAlign: 'center' },
  s12: { flex: 1 },
  s13: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  s14: { flex: 1 },
  s15: { marginTop: 32, paddingHorizontal: 16, paddingBottom: 40 },
  s16: { paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, alignItems: 'center' },
  s17: { color: '#ef4444', fontWeight: '700' },
});
