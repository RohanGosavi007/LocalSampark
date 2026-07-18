import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function EventsTab({ role }) {
  const [events] = useState([
    { id: 1, title: 'Annual General Meeting', date: '25 Jul 2026', time: '10:00 AM', location: 'Clubhouse', type: 'Official' },
    { id: 2, title: 'Diwali Celebration', date: '10 Nov 2026', time: '6:00 PM', location: 'Central Lawn', type: 'Festival' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage Society Events</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Create New Event</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {events.map(ev => (
          <View key={ev.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eTitle}>{ev.title}</Text>
              <View style={[styles.badge, ev.type === 'Official' ? styles.badgePrimary : styles.badgeSecondary]}>
                <Text style={[styles.badgeText, ev.type === 'Official' ? styles.badgePrimaryText : styles.badgeSecondaryText]}>
                  {ev.type}
                </Text>
              </View>
            </View>
            <Text style={styles.eMeta}>📅 {ev.date} at {ev.time}</Text>
            <Text style={styles.eMeta}>📍 {ev.location}</Text>
            <TouchableOpacity style={styles.rsvpBtn}>
              <Text style={styles.rsvpBtnText}>RSVP Yes</Text>
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
  
  eventCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eTitle: { color: '#0f172a', fontSize: 15, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  eMeta: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgePrimary: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' },
  badgePrimaryText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' },
  badgeSecondary: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.2)' },
  badgeSecondaryText: { color: '#ec4899', fontSize: 10, fontWeight: 'bold' },
  
  rsvpBtn: { borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
  rsvpBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 }
});
