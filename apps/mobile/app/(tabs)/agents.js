import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet } from '../../src/lib/api';

/**
 * A franchise partner's team roster.
 *
 * This screen listed three people who do not exist: "Ramesh Singh, Field Agent,
 * 42 shops onboarded, ₹14,500 earned, Active"; "Suresh Patil, 12 shops, ₹4,200";
 * and "Kiran Kumar, Delivery Agent, 156 deliveries, ₹8,900, Inactive". A partner
 * would have believed they had a working team of three and that ₹27,600 had
 * been paid out against it.
 *
 * "Message Agent" popped "Opening chat with Ramesh Singh..." and did nothing;
 * "View KPI" had no handler at all.
 *
 * /territory/agents returns the users actually assigned to this territory,
 * with the shops each has registered and the deliveries each has completed.
 * Per-agent earnings are not shown, because nothing in the backend records
 * them per agent — a dash is honest where "₹14,500" was not.
 */
export default function FranchiseAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet('/territory/agents');
      setAgents(res?.agents ?? []);
      setError(null);
    } catch (err) {
      setAgents([]);
      setError(err?.message || 'Could not load your team.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleLabel = (role) =>
    String(role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Agent';

  const isDelivery = (role) => String(role || '').includes('delivery');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 My Team (Agents)</Text>
        <Text style={styles.subtitle}>Field &amp; Delivery Agents in Territory</Text>
      </View>

      {loading ? (
        <View style={styles.centre}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        {error && (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        )}

        {agents.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nobody is assigned to your territory yet. Agents appear here once an
              administrator assigns them to it.
            </Text>
          </View>
        )}

        {agents.map((agent) => (
          <View key={agent.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.agentName}>{agent.name || 'Agent'}</Text>
              <View style={[styles.statusBadge, agent.active ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusText, agent.active ? { color: '#10b981' } : { color: '#ef4444' }]}>
                  {agent.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <Text style={styles.roleText}>🏷️ {roleLabel(agent.role)}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>
                  {isDelivery(agent.role) ? 'Deliveries' : 'Shops Onboarded'}
                </Text>
                <Text style={styles.statValue}>
                  {isDelivery(agent.role) ? (agent.deliveries ?? 0) : (agent.shopsOnboarded ?? 0)}
                </Text>
              </View>
              <View style={styles.statBox}>
                {/* Was "Total Earnings" with an invented figure. There is no
                    per-agent settlement record to read. */}
                <Text style={styles.statLabel}>Total Earnings</Text>
                <Text style={styles.statValue}>—</Text>
              </View>
            </View>

            {/* "Message Agent" opened nothing. Calling is something the phone
                can genuinely do, and only when a number is on file. */}
            {agent.phone ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.msgBtn}
                  onPress={() => Linking.openURL(`tel:${agent.phone}`)}
                >
                  <Text style={styles.msgBtnText}>📞 Call {agent.phone}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noPhone}>No contact number on file.</Text>
            )}
          </View>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },

  content: { padding: 15 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 15 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  emptyCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  agentName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
  statusInactive: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  roleText: { color: '#475569', fontSize: 14, marginBottom: 15 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statLabel: { color: '#64748b', fontSize: 11, marginBottom: 5, textAlign: 'center' },
  statValue: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 10 },
  msgBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  msgBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  noPhone: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },
});
