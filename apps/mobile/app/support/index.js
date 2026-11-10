/**
 * Help & support (C14): the customer's tickets, the support team's answers,
 * and a form to raise a ticket or a formal grievance.
 *
 * /support?order=<id> opens the form for that order (the "Get help" entry
 * point on an order's screen); the ticket keeps the order.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CATEGORIES, validateTicket, raiseTicket, listMyTickets, groupTickets, grievanceOfficer, ticketRef,
} from '../../src/services/support';

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function SupportScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams();
  const [tab, setTab] = useState(order ? 'new' : 'open');
  const [tickets, setTickets] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    category: order ? 'order' : 'general', subject: '', description: '', orderId: order ? String(order) : '', isStatutory: false,
  });

  const load = useCallback(async () => {
    try {
      setTickets(await listMyTickets());
      setError('');
    } catch (e) {
      setError(e.status === 401 ? 'Please sign in to see your tickets.' : (e.message || 'Could not load your tickets.'));
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    load();
    grievanceOfficer().then(setOfficer).catch(() => setOfficer(null));
  }, [load]);

  const submit = async () => {
    const problem = validateTicket(form);
    if (problem) {
      setNotice({ ok: false, text: problem });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const ticket = await raiseTicket(form);
      setNotice({ ok: true, text: `Ticket ${ticketRef(ticket.id)} registered.` });
      setForm({ category: 'general', subject: '', description: '', orderId: '', isStatutory: false });
      setTab('open');
      await load();
    } catch (e) {
      setNotice({ ok: false, text: e.message || 'Could not register your ticket.' });
    } finally {
      setSending(false);
    }
  };

  const groups = groupTickets(tickets || []);
  const shown = tab === 'resolved' ? groups.resolved : groups.open;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Help & support</Text>

        <View style={styles.tabs} accessibilityRole="tablist">
          {[['open', 'Open'], ['resolved', 'Resolved'], ['new', 'New ticket']].map(([id, label]) => (
            <TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}
              onPress={() => setTab(id)} style={[styles.tab, tab === id && styles.tabActive]}>
              <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {notice && (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, notice.ok ? styles.ok : styles.bad]}>{notice.text}</Text>
        )}
        {!!error && <Text style={[styles.notice, styles.bad]}>{error}</Text>}

        {tab === 'new' ? (
          <View>
            <Text style={styles.label}>What is it about?</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(([value, label]) => (
                <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: form.category === value }}
                  onPress={() => setForm({ ...form, category: value })}
                  style={[styles.chip, form.category === value && styles.chipActive]}>
                  <Text style={form.category === value ? styles.chipTextActive : styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!form.orderId && <Text style={styles.muted}>About order {ticketRef(form.orderId)}</Text>}
            <Text style={styles.label}>Subject</Text>
            <TextInput accessibilityLabel="Subject" style={styles.input} maxLength={200} value={form.subject}
              onChangeText={(subject) => setForm({ ...form, subject })} placeholder="A short summary" />
            <Text style={styles.label}>Details</Text>
            <TextInput accessibilityLabel="Details" style={[styles.input, styles.multiline]} multiline maxLength={5000}
              value={form.description} onChangeText={(description) => setForm({ ...form, description })}
              placeholder="What happened, and what would put it right?" />
            <View style={styles.row}>
              <Switch accessibilityLabel="Register as a formal grievance" value={form.isStatutory}
                onValueChange={(isStatutory) => setForm({ ...form, isStatutory })} />
              <Text style={styles.switchText}>
                Formal grievance under the Consumer Protection (E-Commerce) Rules, 2020 — resolved by our Grievance Officer within 30 days.
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button" disabled={sending} onPress={submit} style={[styles.submit, sending && { opacity: 0.6 }]}>
              <Text style={styles.submitText}>{sending ? 'Sending…' : 'Submit ticket'}</Text>
            </TouchableOpacity>
          </View>
        ) : tickets === null ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : shown.length === 0 ? (
          <Text style={styles.empty}>{tab === 'open' ? 'No open tickets.' : 'No resolved tickets yet.'}</Text>
        ) : (
          shown.map((t) => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.ref}>{ticketRef(t.id)} · {t.category} · {String(t.status).replace('_', ' ')}{t.isStatutory ? ' · Formal grievance' : ''}</Text>
              <Text style={styles.subject}>{t.subject}</Text>
              <Text style={styles.muted}>Raised {when(t.createdAt)}{t.orderId ? ` · Order ${ticketRef(t.orderId)}` : ''}</Text>
              {!!t.resolution && <Text style={styles.resolution}>Support: {t.resolution}</Text>}
            </View>
          ))
        )}

        {officer && (
          <View style={styles.officer}>
            <Text style={styles.label}>Grievance Officer</Text>
            <Text>{officer.name}, {officer.designation}</Text>
            <Text style={styles.muted}>{officer.email} · {officer.phone}</Text>
            <Text style={styles.muted}>Acknowledged within {officer.slaHoursAcknowledgement} hours, resolved within {officer.slaDaysResolution} days.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },
  container: { padding: 16, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: 'center' },
  backText: { color: '#2563EB', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 12, color: '#0F172A' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  tabActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  tabText: { fontWeight: '700', color: '#334155' },
  tabTextActive: { color: '#FFFFFF' },
  notice: { marginVertical: 8, fontWeight: '700' },
  ok: { color: '#047857' },
  bad: { color: '#B91C1C' },
  label: { fontWeight: '800', marginTop: 14, marginBottom: 6, color: '#334155' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  chipText: { color: '#334155' },
  chipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF', minHeight: 48 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  switchText: { flex: 1, color: '#334155' },
  submit: { backgroundColor: '#2563EB', borderRadius: 12, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 32, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  ref: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  subject: { fontSize: 16, fontWeight: '800', marginTop: 4, color: '#0F172A' },
  muted: { color: '#64748B', marginTop: 4 },
  resolution: { marginTop: 8, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, color: '#0F172A' },
  officer: { marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
});
