import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Users, Phone, Mail, Edit2, Shield, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { apiGet } from '../../../../src/lib/api';
import { useAppStore } from '../../../../src/store/useAppStore';

export default function NativeStaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { shopId } = useAppStore();

  const fetchStaff = useCallback(async (isRefresh = false) => {
    if (!shopId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet(`/shops/${shopId}/staff`);
      if (data && (Array.isArray(data) || Array.isArray(data.data) || Array.isArray(data.items))) {
        setStaff(data.data || data.items || data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const renderStaffCard = ({ item }) => {
    const isActive = item.status !== 'inactive';
    
    // Provide fallback icon based on role if no profile image
    return (
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mx-4 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-12 h-12 bg-slate-800 rounded-full mr-4 items-center justify-center border border-slate-700">
            <Users size={20} color="#94a3b8" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{item.name || 'Staff Member'}</Text>
            <View className="flex-row items-center mt-1 space-x-2">
              <View className="bg-blue-500/20 px-2 py-0.5 rounded mr-2 flex-row items-center border border-blue-500/30">
                <Shield size={10} color="#3b82f6" style={{ marginRight: 4 }} />
                <Text className="text-blue-400 text-[10px] font-bold uppercase">{item.role || 'Employee'}</Text>
              </View>
              <View className={`flex-row items-center px-2 py-0.5 rounded ${isActive ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                {isActive ? <CheckCircle2 size={10} color="#34d399" style={{ marginRight: 4 }} /> : <AlertCircle size={10} color="#f87171" style={{ marginRight: 4 }} />}
                <Text className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity className="p-2 bg-slate-800 rounded-lg">
            <Edit2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between border-t border-slate-800/50 pt-3">
          <View className="flex-row items-center flex-1">
            <Phone size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text className="text-slate-400 text-xs font-medium">{item.phone || 'No Phone'}</Text>
          </View>
          <View className="flex-row items-center flex-1 justify-end">
            <Mail size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text className="text-slate-400 text-xs font-medium" numberOfLines={1}>{item.email || 'No Email'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!shopId && !loading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <AlertCircle size={48} color="#f59e0b" className="mb-4" />
        <Text className="text-white font-bold text-lg text-center">Shop ID Missing</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 pt-2">
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : staff.length === 0 ? (
        <View className="items-center justify-center py-20 mx-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
          <Users size={48} color="#475569" className="mb-4" />
          <Text className="text-slate-500 font-bold text-lg">No staff members found</Text>
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderStaffCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchStaff(true)} tintColor="#3b82f6" />
          }
        />
      )}
    </View>
  );
}
