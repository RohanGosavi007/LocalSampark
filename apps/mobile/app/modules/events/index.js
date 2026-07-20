import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_V1 } from '../../config/api';

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState('browse'); // browse, host, my_events, admin
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [myEvents, setMyEvents] = useState({ hosted: [], booked: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newEvent, setNewEvent] = useState({ title: '', description: '', eventDate: '', location: '', ticketPrice: '0', totalTickets: '50', allowCoinDiscount: false });
  const [bookingModal, setBookingModal] = useState(null); // event object
  const [bookingData, setBookingData] = useState({ numTickets: '1', applyDiscount: false });

  useEffect(() => {
    fetchEvents();
    checkRoleAndFetch();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/events`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data.map(e => ({
            id: e.id, title: e.title, description: e.description, event_date: e.event_date,
            venue: e.location, ticket_price: 0, organizer_name: 'Local Host',
            max_attendees: e.attendees_count || 50, status: e.status
        })));
      }
    } catch(e) {} finally {
      setLoading(false);
    }
  };

  const checkRoleAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const resMy = await fetch(`${API_V1}/events/my-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMy = await resMy.json();
      if (dataMy.success) setMyEvents(dataMy.data);

      const payloadStr = atob(token.split('.')[1]);
      const payload = JSON.parse(payloadStr);
      if (['superadmin', 'admin', 'territory_admin', 'area_agent'].includes(payload.role)) {
        setIsAdmin(true);
        const resPending = await fetch(`${API_V1}/events/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataPending = await resPending.json();
        if (dataPending.success) setPendingEvents(dataPending.data);
      }
    } catch(e) {}
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.location || !newEvent.eventDate) {
      Alert.alert('Error', 'Please fill title, location, and date.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        title: newEvent.title,
        description: newEvent.description,
        venue: newEvent.location,
        eventDate: newEvent.eventDate,
        maxAttendees: parseInt(newEvent.totalTickets, 10),
        ticketPrice: parseFloat(newEvent.ticketPrice),
        isPaid: parseFloat(newEvent.ticketPrice) > 0
      };
      const data = await apiPost('/events', payload);
      Alert.alert('Event', data.message);
      setNewEvent({ title: '', description: '', eventDate: '', location: '', ticketPrice: '0', totalTickets: '50', allowCoinDiscount: false });
      fetchEvents();
      setActiveTab('browse');
    } catch(e) {}
  };

  const handleBookTicket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = { ...bookingData, numTickets: parseInt(bookingData.numTickets, 10) };
      const data = await apiPost('/events/${bookingModal.id}/book', payload);
      if (data.success) {
        Alert.alert('Success', `Booking Ref: ${data.data.bookingRef}\nPaid: ₹${data.data.finalPricePaid}\nCoins Deducted: ${data.data.coinsDeducted}`);
        setBookingModal(null);
        fetchEvents();
        checkRoleAndFetch();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  const approveEvent = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/events/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      Alert.alert('Admin', data.message);
      checkRoleAndFetch();
      fetchEvents();
    } catch(e) {}
  };

  const rejectEvent = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/events/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      Alert.alert('Admin', data.message);
      checkRoleAndFetch();
    } catch(e) {}
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'browse':
        return (
          <View>
            {loading ? <ActivityIndicator size="large" color="#d946ef" style={{ marginTop: 20 }} /> : events.length === 0 ? (
              <Text style={styles.emptyText}>No active events found.</Text>
            ) : (
              events.map(e => (
                <View key={e.id} style={styles.eventCard}>
                  <View style={styles.eventCover}>
                    <Text style={styles.eventCoverIcon}>🎟️</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                      <View style={styles.priceBadge}><Text style={styles.priceBadgeText}>{e.ticket_price > 0 ? `₹${e.ticket_price}` : 'FREE'}</Text></View>
                    </View>
                    <Text style={styles.eventDesc} numberOfLines={2}>{e.description}</Text>
                    
                    <View style={styles.eventMeta}>
                      <Text style={styles.metaText}>📅 {new Date(e.event_date).toLocaleDateString()}</Text>
                      <Text style={styles.metaText}>📍 {e.venue}</Text>
                      <Text style={styles.metaText}>👤 Host: {e.organizer_name}</Text>
                    </View>

                    <View style={styles.eventFooter}>
                      <Text style={styles.spotsText}>{e.available_tickets} / {e.max_attendees} spots left</Text>
                      <TouchableOpacity 
                        style={[styles.bookBtn, e.available_tickets === 0 && styles.bookBtnDisabled]} 
                        disabled={e.available_tickets === 0}
                        onPress={() => setBookingModal(e)}
                      >
                        <Text style={styles.bookBtnText}>{e.available_tickets === 0 ? 'Sold Out' : 'Get Tickets'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      case 'host':
        return (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create a New Event</Text>
            <Text style={styles.formDesc}>Standard residents require admin approval before the event goes live.</Text>

            <TextInput style={styles.input} placeholder="Event Title (e.g. Sunday Market)" value={newEvent.title} onChangeText={t=>setNewEvent({...newEvent, title: t})} />
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Event Description" multiline value={newEvent.description} onChangeText={t=>setNewEvent({...newEvent, description: t})} />
            <TextInput style={styles.input} placeholder="Date & Time (e.g. 2026-08-15 10:00)" value={newEvent.eventDate} onChangeText={t=>setNewEvent({...newEvent, eventDate: t})} />
            <TextInput style={styles.input} placeholder="Location" value={newEvent.location} onChangeText={t=>setNewEvent({...newEvent, location: t})} />

            <View style={styles.rowBetween}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Ticket Price (₹)</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={newEvent.ticketPrice} onChangeText={t=>setNewEvent({...newEvent, ticketPrice: t})} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Total Tickets</Text>
                <TextInput style={styles.input} placeholder="50" keyboardType="numeric" value={newEvent.totalTickets} onChangeText={t=>setNewEvent({...newEvent, totalTickets: t})} />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow Coin Discount (100 Coins = ₹10 off)</Text>
              <Switch value={newEvent.allowCoinDiscount} onValueChange={v=>setNewEvent({...newEvent, allowCoinDiscount: v})} />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEvent}>
              <Text style={styles.submitBtnText}>Submit Event for Approval</Text>
            </TouchableOpacity>
          </View>
        );
      case 'my_events':
        return (
          <View>
            <Text style={styles.sectionTitle}>My Booked Tickets</Text>
            {myEvents.booked.length === 0 ? <Text style={styles.emptyText}>No tickets booked.</Text> : (
              myEvents.booked.map(t => (
                <View key={t.id} style={styles.ticketCard}>
                  <View style={styles.ticketRibbon}><Text style={styles.ticketRibbonText}>TICKET</Text></View>
                  <Text style={styles.ticketTitle}>{t.event_title}</Text>
                  <Text style={styles.ticketMeta}>📅 {new Date(t.event_date).toLocaleDateString()}  📍 {t.location}</Text>
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketDetailText}>Ref: {t.id}</Text>
                    <Text style={styles.ticketDetailText}>Tickets: {t.ticket_count}</Text>
                    <Text style={[styles.ticketDetailText, { color: '#d946ef', fontWeight: '800' }]}>Paid: ₹{t.total_price}</Text>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24, borderLeftColor: '#f59e0b' }]}>Events I Am Hosting</Text>
            {myEvents.hosted.length === 0 ? <Text style={styles.emptyText}>No events hosted.</Text> : (
              myEvents.hosted.map(e => (
                <View key={e.id} style={[styles.hostedCard, e.status === 'active' ? { borderLeftColor: '#d946ef' } : { borderLeftColor: '#94a3b8' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hostedTitle}>{e.title}</Text>
                    <Text style={styles.hostedMeta}>📅 {new Date(e.event_date).toLocaleDateString()} | 🎟️ {e.total_tickets - e.available_tickets}/{e.total_tickets} Booked</Text>
                  </View>
                  <View style={[styles.statusBadge, e.status === 'active' && styles.statusBadgeActive]}>
                    <Text style={[styles.statusBadgeText, e.status === 'active' && styles.statusBadgeTextActive]}>{String(e.status || '').toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      case 'admin':
        return (
          <View>
            <Text style={styles.sectionTitle}>Moderate Pending Events</Text>
            {pendingEvents.length === 0 ? <Text style={styles.emptyText}>No pending events.</Text> : (
              pendingEvents.map(e => (
                <View key={e.id} style={styles.adminCard}>
                  <Text style={styles.adminTitle}>{e.title}</Text>
                  <Text style={styles.adminMeta}>By {e.organizer_name} | {new Date(e.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.adminDesc}>{e.description}</Text>
                  <View style={styles.adminActions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectEvent(e.id)}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approveEvent(e.id)}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events & Ticketing</Text>
      </View>

      <View style={styles.tabsScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'browse' && styles.tabBtnActive]} onPress={() => setActiveTab('browse')}>
            <Text style={[styles.tabBtnText, activeTab === 'browse' && styles.tabBtnTextActive]}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'host' && styles.tabBtnActive]} onPress={() => setActiveTab('host')}>
            <Text style={[styles.tabBtnText, activeTab === 'host' && styles.tabBtnTextActive]}>Host</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'my_events' && styles.tabBtnActive]} onPress={() => setActiveTab('my_events')}>
            <Text style={[styles.tabBtnText, activeTab === 'my_events' && styles.tabBtnTextActive]}>My Tickets</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'admin' && styles.tabBtnActive]} onPress={() => setActiveTab('admin')}>
              <Text style={[styles.tabBtnText, activeTab === 'admin' && styles.tabBtnTextActive]}>Admin</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderTab()}
      </ScrollView>

      {/* Booking Modal */}
      {bookingModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Book Tickets</Text>
              <Text style={styles.modalEventTitle}>{bookingModal.title}</Text>

              <Text style={styles.label}>Number of Tickets</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={bookingData.numTickets} onChangeText={t=>setBookingData({...bookingData, numTickets: t})} />

              {bookingModal.allow_coin_discount && bookingModal.ticket_price > 0 && (
                <View style={[styles.switchRow, { backgroundColor: '#fae8ff', borderColor: '#e879f9' }]}>
                  <Text style={[styles.switchLabel, { color: '#86198f' }]}>Apply SamparkCoins Discount</Text>
                  <Switch value={bookingData.applyDiscount} onValueChange={v=>setBookingData({...bookingData, applyDiscount: v})} />
                </View>
              )}

              <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Subtotal:</Text>
                  <Text style={styles.receiptValue}>₹{(bookingModal.ticket_price || 0) * (parseInt(bookingData.numTickets)||1)}</Text>
                </View>
                {bookingData.applyDiscount && bookingModal.allow_coin_discount && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: '#d946ef' }]}>Coin Discount:</Text>
                    <Text style={[styles.receiptValue, { color: '#d946ef' }]}>- ₹{10 * (parseInt(bookingData.numTickets)||1)}</Text>
                  </View>
                )}
                <View style={[styles.receiptRow, styles.receiptTotal]}>
                  <Text style={styles.receiptTotalText}>Total Payable:</Text>
                  <Text style={styles.receiptTotalText}>₹{Math.max(0, ((bookingModal.ticket_price || 0) * (parseInt(bookingData.numTickets)||1)) - (bookingData.applyDiscount && bookingModal.allow_coin_discount ? 10 * (parseInt(bookingData.numTickets)||1) : 0))}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleBookTicket}><Text style={styles.confirmBtnText}>Confirm Booking</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#d946ef', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabsScrollWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16 },
  tabBtn: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 3, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#d946ef' },
  tabBtnText: { fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#d946ef', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 60 },
  emptyText: { color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

  eventCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, overflow: 'hidden' },
  eventCover: { height: 100, backgroundColor: '#d946ef', opacity: 0.8, alignItems: 'center', justifyContent: 'center' },
  eventCoverIcon: { fontSize: 40 },
  eventInfo: { padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 12 },
  priceBadge: { backgroundColor: '#fae8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priceBadgeText: { color: '#a21caf', fontSize: 12, fontWeight: '800' },
  eventDesc: { fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 18 },
  eventMeta: { marginBottom: 16, gap: 4 },
  metaText: { fontSize: 12, color: '#64748b' },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 },
  spotsText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  bookBtn: { backgroundColor: '#d946ef', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookBtnDisabled: { backgroundColor: '#cbd5e1' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  formDesc: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16, color: '#0f172a' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  switchLabel: { fontSize: 13, color: '#475569', flex: 1, paddingRight: 12 },
  submitBtn: { backgroundColor: '#d946ef', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: '#d946ef' },
  ticketCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden' },
  ticketRibbon: { position: 'absolute', top: 0, right: 0, backgroundColor: '#d946ef', paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12 },
  ticketRibbonText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  ticketTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6, paddingRight: 60 },
  ticketMeta: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  ticketDetails: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between' },
  ticketDetailText: { fontSize: 12, color: '#475569' },

  hostedCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  hostedTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  hostedMeta: { fontSize: 12, color: '#64748b' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeActive: { backgroundColor: '#fae8ff' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  statusBadgeTextActive: { color: '#a21caf' },

  adminCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  adminTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  adminMeta: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  adminDesc: { fontSize: 13, color: '#0f172a', marginBottom: 16 },
  adminActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#64748b', alignItems: 'center' },
  rejectBtnText: { color: '#475569', fontWeight: '700' },
  approveBtn: { flex: 1, backgroundColor: '#d946ef', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  modalEventTitle: { fontSize: 16, color: '#d946ef', fontWeight: '700', marginBottom: 20 },
  
  receiptBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptLabel: { fontSize: 14, color: '#64748b' },
  receiptValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  receiptTotal: { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 12, marginTop: 4, marginBottom: 0 },
  receiptTotalText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  confirmBtn: { flex: 2, backgroundColor: '#d946ef', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' }
});
