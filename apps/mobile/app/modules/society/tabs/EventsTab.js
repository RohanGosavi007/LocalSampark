import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../../src/lib/api';

/**
 * The society's events tab.
 *
 * Two events were listed that nobody had scheduled: an "Annual General Meeting"
 * on 25 Jul 2026 at 10:00 AM in the Clubhouse, and a "Diwali Celebration" on
 * 10 Nov 2026 at 6:00 PM on the Central Lawn. Both carried an RSVP button that
 * did nothing, so a resident could have blocked out a morning for a meeting
 * that was never called and told the committee they were coming without anyone
 * receiving it.
 *
 * "+ Create New Event" had no handler either.
 *
 * /events returns the events that have actually been created, and RSVP books a
 * real ticket through /events/:id/book.
 */
export default function EventsTab({ role }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [booked, setBooked] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/events');
      setEvents(res?.data ?? []);
      setError(null);
    } catch (err) {
      setEvents([]);
      setError(err?.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rsvp = useCallback(async (event) => {
    setBusyId(event.id);
    try {
      await apiPost(`/events/${event.id}/book`, { numTickets: 1 });
      setBooked((prev) => new Set(prev).add(String(event.id)));
      Alert.alert('You are on the list', `Your place at ${event.title} is booked.`);
    } catch (err) {
      // The button used to do nothing at all, so a full event and a successful
      // booking looked identical.
      Alert.alert('Not booked', err?.message || 'Your RSVP was not recorded.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const when = (event) => {
    const date = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    return [date, event.start_time].filter(Boolean).join(' at ');
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage Society Events</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/modules/events/create')}>
            <Text style={styles.primaryBtnText}>+ Create New Event</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>

        {loading ? (
          <ActivityIndicator color="#3b82f6" style={{ paddingVertical: 20 }} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>
            {error || 'Nothing is scheduled yet. Events your society creates will appear here.'}
          </Text>
        ) : events.map((ev) => (
          <View key={String(ev.id)} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eTitle}>{ev.title}</Text>
              {ev.category ? (
                <View style={[styles.badge, styles.badgeSecondary]}>
                  <Text style={[styles.badgeText, styles.badgeSecondaryText]}>{ev.category}</Text>
                </View>
              ) : null}
            </View>
            {when(ev) ? <Text style={styles.eMeta}>📅 {when(ev)}</Text> : null}
            {ev.venue ? <Text style={styles.eMeta}>📍 {ev.venue}</Text> : null}
            {ev.organizer_name ? <Text style={styles.eMeta}>🙋 {ev.organizer_name}</Text> : null}

            <TouchableOpacity
              style={[styles.rsvpBtn, booked.has(String(ev.id)) && styles.rsvpBtnDone]}
              disabled={busyId === ev.id || booked.has(String(ev.id))}
              onPress={() => rsvp(ev)}
            >
              {busyId === ev.id
                ? <ActivityIndicator size="small" color="#3b82f6" />
                : <Text style={styles.rsvpBtnText}>{booked.has(String(ev.id)) ? 'You are going' : 'RSVP Yes'}</Text>}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 13, lineHeight: 19 },

  eventCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eTitle: { color: '#0f172a', fontSize: 15, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  eMeta: { color: '#64748b', fontSize: 13, marginBottom: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  badgeSecondary: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.2)' },
  badgeSecondaryText: { color: '#ec4899' },

  rsvpBtn: { borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
  rsvpBtnDone: { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' },
  rsvpBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 },
});
