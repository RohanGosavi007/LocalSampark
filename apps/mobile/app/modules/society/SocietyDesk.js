import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';

/**
 * The society admin's desk.
 *
 * Three jobs that are genuinely a committee member's, and nothing that is not:
 * approving the people who want to join the society, seeing whether the gate is
 * actually staffed right now, and telling everyone something.
 *
 * ── Why the roster shows "who is on the gate", not a shift table ───────────
 *
 * The question a committee member asks at 9pm is never "what is the roster" —
 * it is "is there somebody at the gate". A grid of shifts answers that only
 * after you have worked out what time it is and which row applies, which is why
 * rosters get checked once and then trusted for a month. This answers it in a
 * sentence and shows the grid underneath for the people who want it.
 *
 * ── Broadcast asks twice ───────────────────────────────────────────────────
 *
 * A notice goes to every phone in the society at once and cannot be recalled.
 * The confirmation is not ceremony; it is the difference between a water-outage
 * notice and a 2am test message to four hundred people.
 */

const TABS = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'gate', label: 'Gate' },
  { id: 'notice', label: 'Notice' },
];

export default function SocietyDesk() {
  const [tab, setTab] = useState('approvals');

  const [pendingMembers, setPendingMembers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    const [membersResult, rosterResult] = await Promise.allSettled([
      apiGet('/societies/members/pending'),
      apiGet('/society-shifts/roster'),
    ]);

    if (membersResult.status === 'fulfilled') {
      setPendingMembers(membersResult.value?.members || membersResult.value?.data || []);
    }

    if (rosterResult.status === 'fulfilled') {
      setRoster(rosterResult.value?.roster || rosterResult.value?.data || []);
    }

    // Only a total failure is worth a banner. One endpoint being unavailable
    // leaves the other tab usable, and saying "everything is broken" when half
    // of it works is how people stop reading the banner.
    if (membersResult.status === 'rejected' && rosterResult.status === 'rejected') {
      setError('Could not reach the society service. Pull to retry.');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decideMember = async (member, approve) => {
    setActing(member.id);
    const previous = pendingMembers;
    setPendingMembers((list) => list.filter((m) => m.id !== member.id));

    try {
      await apiPost('/societies/members/decision', {
        memberId: member.id,
        decision: approve ? 'approved' : 'rejected',
      });
    } catch (err) {
      setPendingMembers(previous);
      Alert.alert('That did not go through', err?.message || 'The request is unchanged.');
    } finally {
      setActing(null);
    }
  };

  /** Whoever is on the gate right now, from the roster the server returned. */
  const onDutyNow = (() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return roster.filter((shift) => {
      const date = String(shift.shift_date || '').slice(0, 10);
      if (date !== today) return false;

      // A shift without times cannot be placed in the day; count it as on duty
      // rather than hiding it, because an unplaceable shift is still a person
      // the committee rostered.
      if (!shift.start_time || !shift.end_time) return true;

      const clock = now.toTimeString().slice(0, 5);
      const start = String(shift.start_time).slice(0, 5);
      const end = String(shift.end_time).slice(0, 5);

      // Overnight shifts wrap past midnight, so the comparison cannot be a
      // simple between.
      return start <= end ? clock >= start && clock <= end : clock >= start || clock <= end;
    });
  })();

  const sendNotice = () => {
    const title = noticeTitle.trim();
    const body = noticeBody.trim();
    if (!title || !body) return;

    Alert.alert(
      'Send to everyone?',
      `This goes to every resident in the society now and cannot be recalled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            try {
              await apiPost('/societies/notices', { title, content: body });
              setNoticeTitle('');
              setNoticeBody('');
              Alert.alert('Notice sent', 'Every resident has been notified.');
            } catch (err) {
              Alert.alert('Could not send', err?.message || 'Nobody was notified. Try again.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centre]}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Society Desk</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id ? styles.tabOn : null]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id ? styles.tabTextOn : null]}>
              {t.label}
              {t.id === 'approvals' && pendingMembers.length > 0 ? ` (${pendingMembers.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#a78bfa" />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === 'approvals' ? (
          pendingMembers.length === 0 ? (
            <View style={styles.quietCard}>
              <Text style={styles.quietText}>Nobody is waiting to be approved.</Text>
            </View>
          ) : (
            pendingMembers.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.full_name || member.name || 'Applicant'}</Text>
                  <Text style={styles.memberMeta}>
                    Flat {member.flat_number || '—'}
                    {member.phone_number ? ` · ${member.phone_number}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.rejectBtn, acting === member.id ? styles.btnBusy : null]}
                  onPress={() => decideMember(member, false)}
                  disabled={acting === member.id}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, acting === member.id ? styles.btnBusy : null]}
                  onPress={() => decideMember(member, true)}
                  disabled={acting === member.id}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : null}

        {tab === 'gate' ? (
          <>
            <View style={[styles.statusCard, onDutyNow.length > 0 ? styles.statusOk : styles.statusWarn]}>
              <Text style={styles.statusTitle}>
                {onDutyNow.length > 0
                  ? `${onDutyNow.length} on the gate now`
                  : 'Nobody is on the gate right now'}
              </Text>
              <Text style={styles.statusSub}>
                {onDutyNow.length > 0
                  ? onDutyNow.map((s) => s.guard_name || s.guard_id).filter(Boolean).join(', ')
                  : 'No shift covers this hour in the roster.'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Today&apos;s roster</Text>
            {roster.length === 0 ? (
              <Text style={styles.emptyNote}>No shifts rostered.</Text>
            ) : (
              roster.map((shift) => (
                <View key={shift.id} style={styles.shiftRow}>
                  <Text style={styles.shiftGuard}>{shift.guard_name || shift.guard_id || 'Unassigned'}</Text>
                  <Text style={styles.shiftTime}>
                    {shift.start_time && shift.end_time
                      ? `${String(shift.start_time).slice(0, 5)}–${String(shift.end_time).slice(0, 5)}`
                      : shift.shift_type || '—'}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'notice' ? (
          <>
            <Text style={styles.sectionSub}>
              Goes to every resident&apos;s phone immediately.
            </Text>

            <TextInput
              style={styles.input}
              value={noticeTitle}
              onChangeText={setNoticeTitle}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={noticeBody}
              onChangeText={setNoticeBody}
              placeholder="What do residents need to know?"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!noticeTitle.trim() || !noticeBody.trim() || sending) ? styles.btnBusy : null]}
              onPress={sendNotice}
              disabled={!noticeTitle.trim() || !noticeBody.trim() || sending}
            >
              {sending
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={styles.sendText}>Send to all residents</Text>}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#e2e8f0', fontSize: 30, lineHeight: 32 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  tabOn: { backgroundColor: '#7c3aed', borderColor: '#a78bfa' },
  tabText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  tabTextOn: { color: '#f8fafc' },

  body: { padding: 16, paddingBottom: 48 },
  error: { color: '#fca5a5', marginBottom: 12, fontWeight: '600' },

  quietCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  quietText: { color: '#94a3b8', fontSize: 14 },

  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  memberName: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  memberMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  rejectBtn: { backgroundColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  rejectText: { color: '#e2e8f0', fontWeight: '700', fontSize: 13 },
  approveBtn: { backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  approveText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  btnBusy: { opacity: 0.5 },

  statusCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  statusOk: { backgroundColor: '#052e16', borderColor: '#16a34a' },
  statusWarn: { backgroundColor: '#431407', borderColor: '#f97316' },
  statusTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  statusSub: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },

  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  sectionSub: { color: '#94a3b8', fontSize: 13, marginBottom: 12 },
  emptyNote: { color: '#64748b', fontSize: 13 },

  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  shiftGuard: { color: '#f8fafc', fontWeight: '700' },
  shiftTime: { color: '#94a3b8', fontFamily: 'monospace' },

  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  textarea: { minHeight: 120 },
  sendBtn: { backgroundColor: '#a78bfa', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 8 },
  sendText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});
