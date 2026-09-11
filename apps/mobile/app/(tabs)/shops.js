import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet, apiPut } from '../../src/lib/api';

/**
 * Franchise partner's territory shop list.
 *
 * This screen was entirely invented: three shops — "Sharma Grocery, owner Rahul
 * Sharma, ₹42,500 revenue", "Pune Pharmacy, ₹1,12,000", "Sunny Hardware,
 * Pending Approval" — with named owners and revenue figures shown to every
 * franchise partner as the businesses in their pincode.
 *
 * "Review KYC & Approve" was worse than fabricated data. It popped "Approved —
 * Shop is now live in your territory" and changed a value in React state. No
 * approval endpoint existed anywhere in the backend, so a partner would tell a
 * shop owner they were live while the shop stayed pending, unverified and
 * invisible, and the partner had no way to discover the discrepancy.
 *
 * GET /territory/pending-approvals now returns the real shops with owner and
 * revenue, and PUT /territory/shops/:id/approval performs a real approval.
 */
export default function FranchiseShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/territory/pending-approvals');
      const rows = res?.data ?? [];
      setShops(
        rows.map((s) => ({
          id: String(s.id),
          name: s.name || 'Shop',
          owner: s.owner_name || null,
          category: s.category || null,
          status: s.approval_status === 'approved' ? 'Active'
            : s.approval_status === 'rejected' ? 'Rejected'
            : 'Pending Approval',
          approvalStatus: s.approval_status || 'pending',
          revenue: Number(s.revenue) || 0,
        }))
      );
    } catch (err) {
      setShops([]);
      setError(err?.message || 'Could not load your territory shops.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = (shop) => {
    Alert.alert(
      'Approve this shop?',
      `${shop.name} will go live in your territory and its owner will get merchant access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setApproving(shop.id);
            try {
              await apiPut(`/territory/shops/${shop.id}/approval`, { status: 'approved' });
              await load({ isRefresh: true });
            } catch (err) {
              // The old version reported success unconditionally.
              Alert.alert('Not approved', err?.message || 'The approval could not be saved. Try again.');
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Territory Shops</Text>
        <Text style={styles.subtitle}>Manage businesses in your Pincode</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
          }
        >
          {shops.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your territory' : 'No shops in your territory yet'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Shops that register in your pincode will appear here for review.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : shops.map(shop => (
            <View key={shop.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <View style={[styles.statusBadge, shop.status === 'Active' ? styles.statusActive : styles.statusPending]}>
                  <Text style={[styles.statusText, shop.status === 'Active' ? {color: '#10b981'} : {color: '#f59e0b'}]}>
                    {shop.status}
                  </Text>
                </View>
              </View>

              {/* Owner and category are shown only when the record has them. */}
              {shop.owner ? <Text style={styles.infoText}>👤 {shop.owner}</Text> : null}
              {shop.category ? <Text style={styles.infoText}>🏷️ {shop.category}</Text> : null}

              <View style={styles.revenueBox}>
                <Text style={styles.revenueLabel}>Platform Revenue Generated</Text>
                <Text style={styles.revenueValue}>₹{shop.revenue.toLocaleString('en-IN')}</Text>
              </View>

              {shop.approvalStatus === 'pending' ? (
                <TouchableOpacity
                  style={[styles.approveBtn, approving === shop.id && { opacity: 0.6 }]}
                  disabled={approving === shop.id}
                  onPress={() => handleApprove(shop)}
                >
                  {approving === shop.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.approveBtnText}>Review KYC & Approve</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },

  content: { padding: 15 },

  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  shopName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', flex: 1 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  statusText: { fontSize: 12, fontWeight: '700' },

  infoText: { color: '#475569', fontSize: 14, marginBottom: 4 },

  revenueBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  revenueLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  revenueValue: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 2 },

  approveBtn: { marginTop: 12, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  approveBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 15 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});
