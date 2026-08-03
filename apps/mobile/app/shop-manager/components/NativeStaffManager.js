import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Users, Phone, Mail, Edit2, Shield, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { apiGet } from '../../../src/lib/api';
import { useAppStore } from '../../../src/store/useAppStore';

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
      <View style={s.s0}>
        <View style={s.s1}>
          <View style={s.s2}>
            <Users size={20} color="#94a3b8" />
          </View>
          <View style={s.s3}>
            <Text style={s.s4}>{item.name || 'Staff Member'}</Text>
            <View style={s.s5}>
              <View style={s.s6}>
                <Shield size={10} color="#3b82f6" style={{ marginRight: 4 }} />
                <Text style={s.s7}>{item.role || 'Employee'}</Text>
              </View>
              <View style={[s.s20, isActive ? s.s21 : s.s22]}>
                {isActive ? <CheckCircle2 size={10} color="#34d399" style={{ marginRight: 4 }} /> : <AlertCircle size={10} color="#f87171" style={{ marginRight: 4 }} />}
                <Text style={[s.s23, isActive ? s.s24 : s.s25]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.s8}>
            <Edit2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={s.s9}>
          <View style={s.s10}>
            <Phone size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={s.s11}>{item.phone || 'No Phone'}</Text>
          </View>
          <View style={s.s12}>
            <Mail size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={s.s13} numberOfLines={1}>{item.email || 'No Email'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!shopId && !loading) {
    return (
      <View style={s.s14}>
        <AlertCircle size={48} color="#f59e0b" />
        <Text style={s.s15}>Shop ID Missing</Text>
      </View>
    );
  }

  return (
    <View style={s.s16}>
      {loading ? (
        <View style={s.s17}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : staff.length === 0 ? (
        <View style={s.s18}>
          <Users size={48} color="#475569" />
          <Text style={s.s19}>No staff members found</Text>
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
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

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  s1: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  s2: { width: 48, height: 48, backgroundColor: '#1e293b', borderRadius: 9999, marginRight: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  s3: { flex: 1 },
  s4: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  s5: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  s6: { backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  s7: { color: '#60a5fa', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  s8: { padding: 8, backgroundColor: '#1e293b', borderRadius: 8 },
  s9: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(30,41,59,0.5)', paddingTop: 12 },
  s10: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  s11: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  s12: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  s13: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  s14: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  s15: { color: '#ffffff', fontWeight: '700', fontSize: 18, textAlign: 'center' },
  s16: { flex: 1, paddingTop: 8 },
  s17: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  s18: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, marginHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.5)' },
  s19: { color: '#64748b', fontWeight: '700', fontSize: 18 },
  s20: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  s21: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  s22: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  s23: { fontSize: 10, fontWeight: '700' },
  s24: { color: '#34d399' },
  s25: { color: '#f87171' },
});
