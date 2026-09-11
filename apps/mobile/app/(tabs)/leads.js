import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet, apiPut } from '../../src/lib/api';

/**
 * A field agent's sales pipeline.
 *
 * Four businesses were listed here that do not exist, each with a working-format
 * mobile number and a note implying a conversation had taken place: "Gupta
 * Medicals, 9876543210, Follow Up, Interested, needs demo"; "Sunny Hardware,
 * 9988776655, Pending KYC, Awaiting PAN card upload"; "Royal Bakery,
 * 9123456789, Not Interested, Using Zomato, fees issue"; "Modern Salon,
 * 9001122334, Call back at 5 PM". An agent working this list would have dialled
 * four strangers about a demo they never asked for.
 *
 * The two buttons on each card did nothing at all.
 *
 * /crm/leads returns the leads actually assigned to this agent, and the tick
 * now writes through /crm/leads/:id/status. The filters use the status
 * vocabulary crm_leads really stores rather than the three invented labels.
 */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'converted', label: 'Converted' },
  { id: 'lost', label: 'Lost' },
];

const STATUS_COLORS = {
  new: '#8b5cf6',
  contacted: '#3b82f6',
  qualified: '#f59e0b',
  converted: '#10b981',
  lost: '#ef4444',
};

// The tick advances a lead one step; a converted or lost lead is finished.
const NEXT_STATUS = { new: 'contacted', contacted: 'qualified', qualified: 'converted' };

export default function FieldLeads() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet('/crm/leads');
      const rows = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? []);
      setLeads(
        rows.map((l) => ({
          id: String(l.id),
          name: [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead',
          phone: l.phone || null,
          status: String(l.status || 'new').toLowerCase(),
          note: l.notes || '',
          source: l.lead_source || '',
          createdAt: l.created_at,
        }))
      );
      setError(null);
    } catch (err) {
      setLeads([]);
      setError(err?.message || 'Could not load your pipeline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = useCallback(async (lead) => {
    const next = NEXT_STATUS[lead.status];
    if (!next) return;
    setBusyId(lead.id);
    try {
      await apiPut(`/crm/leads/${lead.id}/status`, { status: next });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: next } : l)));
    } catch (err) {
      // The button used to do nothing silently, so a failure and a success
      // looked identical.
      Alert.alert('Not saved', err?.message || 'The lead was not updated.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const filtered = activeFilter === 'all' ? leads : leads.filter((l) => l.status === activeFilter);

  const statusColor = (status) => STATUS_COLORS[status] || '#64748b';
  const label = (status) => status.charAt(0).toUpperCase() + status.slice(1);
  const since = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📈 Sales Pipeline</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, activeFilter === f.id && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.filterBtnText, activeFilter === f.id && styles.filterBtnTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
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

        {filtered.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {leads.length === 0
                ? 'No leads are assigned to you yet. Prospects you add appear here.'
                : 'No leads at this stage.'}
            </Text>
          </View>
        )}

        {filtered.map((lead) => (
          <View key={lead.id} style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <Text style={styles.leadName}>{lead.name}</Text>
              <View style={[styles.statusBadge, { borderColor: statusColor(lead.status) }]}>
                <Text style={[styles.statusText, { color: statusColor(lead.status) }]}>{label(lead.status)}</Text>
              </View>
            </View>

            {lead.phone ? <Text style={styles.leadPhone}>📞 {lead.phone}</Text> : null}
            {lead.note ? <Text style={styles.leadNote}>📝 {lead.note}</Text> : null}

            <View style={styles.footerRow}>
              <Text style={styles.lastContact}>
                {[lead.source, since(lead.createdAt) && `Added ${since(lead.createdAt)}`].filter(Boolean).join(' • ')}
              </Text>
              <View style={styles.actionBtns}>
                {lead.phone ? (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                    <Text>📱</Text>
                  </TouchableOpacity>
                ) : null}
                {NEXT_STATUS[lead.status] ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    disabled={busyId === lead.id}
                    onPress={() => advance(lead)}
                  >
                    {busyId === lead.id ? <ActivityIndicator size="small" color="#3b82f6" /> : <Text>✅</Text>}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
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

  filterRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexWrap: 'wrap', gap: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  filterBtnTextActive: { color: '#ffffff' },

  content: { padding: 15 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 15 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  emptyCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  leadCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  leadName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  leadPhone: { color: '#475569', fontSize: 13, marginBottom: 5 },
  leadNote: { color: '#64748b', fontSize: 13, marginBottom: 15, fontStyle: 'italic' },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  lastContact: { color: '#64748b', fontSize: 11, flex: 1, marginRight: 8 },
  actionBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 40, alignItems: 'center' },
});
