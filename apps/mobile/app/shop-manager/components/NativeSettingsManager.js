import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Settings, Bell, CreditCard, Clock, Shield, AlertCircle, ChevronRight, Store } from 'lucide-react-native';
import { apiGet } from '../../../../src/lib/api';
import { useAppStore } from '../../../../src/store/useAppStore';

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
    <View className="flex-row items-center px-4 pt-6 pb-2">
      <Icon size={16} color="#3b82f6" style={{ marginRight: 8 }} />
      <Text className="text-blue-400 font-bold text-xs uppercase tracking-wider">{title}</Text>
    </View>
  );

  const renderToggleRow = (label, description, key, defaultValue = false) => (
    <View className="flex-row items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-800">
      <View className="flex-1 pr-4">
        <Text className="text-white font-medium text-base mb-1">{label}</Text>
        <Text className="text-slate-500 text-xs leading-tight">{description}</Text>
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
    <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-800">
      <Text className="text-white font-medium text-base">{label}</Text>
      <View className="flex-row items-center">
        <Text className="text-slate-400 text-sm mr-2">{value}</Text>
        <ChevronRight size={16} color="#64748b" />
      </View>
    </TouchableOpacity>
  );

  if (!shopId && !loading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <AlertCircle size={48} color="#f59e0b" className="mb-4" />
        <Text className="text-white font-bold text-lg text-center">Shop ID Missing</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
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

          <View className="mt-8 px-4 pb-10">
            <TouchableOpacity className="py-4 border border-red-500/30 bg-red-500/10 rounded-xl items-center">
              <Text className="text-red-500 font-bold">Temporarily Close Shop</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
