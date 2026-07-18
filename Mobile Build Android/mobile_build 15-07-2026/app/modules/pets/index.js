import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';

const VETS = [
  { name: "Dr. Anand's Pet Clinic", spec: 'All Pets', dist: '0.9 km', phone: '+91 9876577710', timing: 'Daily 9AM–8PM', icon: '🏥' },
  { name: 'Paws & Care Veterinary', spec: 'Dogs & Cats', dist: '1.8 km', phone: '+91 9876588820', timing: 'Mon–Sat 10AM–7PM', icon: '🐕‍🦺' },
  { name: 'Dhanori Animal Hospital', spec: 'Emergency 24/7', dist: '2.1 km', phone: '+91 9876599930', timing: '24 Hours', icon: '🚑' },
];

const INITIAL_LOST = [
  { id: 1, type: 'lost', name: 'Coco', species: 'Cat', breed: 'Persian', color: 'White & Orange', area: 'Ganga Aria Society', date: '2 days ago', contact: '+91 9876512345', icon: '🐱', reward: '₹500' },
  { id: 2, type: 'found', name: 'Unnamed Dog', species: 'Dog', breed: 'Labrador', color: 'Golden', area: 'Goodwill Woodlands Gate', date: '1 day ago', contact: '+91 9876567890', icon: '🐕', reward: null },
  { id: 3, type: 'lost', name: 'Moti', species: 'Dog', breed: 'Indie', color: 'Brown & White', area: 'Pride Aashiyana Lane 3', date: '5 hours ago', contact: '+91 9876524680', icon: '🐕', reward: '₹1,000' },
];

const SERVICES = [
  { title: 'Pet Grooming', desc: 'Home visit grooming for dogs and cats.', price: '₹350 onwards', icon: '✂️' },
  { title: 'Pet Sitting', desc: 'Trusted neighbor pet sitters verified by LocalSampark.', price: '₹200/day', icon: '🏠' },
  { title: 'Dog Walking', desc: 'Professional daily dog walkers available in Dhanori.', price: '₹150/walk', icon: '🦮' },
  { title: 'Pet Supplies Delivery', desc: 'Food, accessories, and medicine delivered from local stores.', price: 'Free delivery', icon: '📦' },
];

function PetsModule() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [alerts, setAlerts] = useState(INITIAL_LOST);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'lost', name: '', species: 'Dog', breed: '', color: '', area: '', contact: '', reward: '' });

  const handlePost = () => {
    if (!form.name || !form.contact) {
      Alert.alert('Error', 'Please fill required fields (Name, Contact).');
      return;
    }
    const newAlert = {
      id: Date.now(),
      ...form,
      date: 'Just now',
      icon: form.species === 'Cat' ? '🐱' : '🐕',
      reward: form.reward ? `₹${form.reward}` : null
    };
    setAlerts([newAlert, ...alerts]);
    setShowForm(false);
    setForm({ type: 'lost', name: '', species: 'Dog', breed: '', color: '', area: '', contact: '', reward: '' });
    Alert.alert('Success', 'Alert posted successfully! Neighbors notified.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🐾 Pets Community</Text>
      </View>

      <View style={styles.tabContainer}>
        {[
          { id: 'alerts', label: '🔍 Alerts' },
          { id: 'vets', label: '🏥 Vets' },
          { id: 'services', label: '✂️ Services' }
        ].map(tab => (
          <TouchableOpacity 
            key={tab.id} 
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {activeTab === 'alerts' && (
          <View>
            <TouchableOpacity style={styles.postBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.postBtnText}>📢 Post an Alert (Lost/Found)</Text>
            </TouchableOpacity>
            
            {alerts.map(a => (
              <View key={a.id} style={[styles.card, {borderTopWidth: 3, borderTopColor: a.type === 'lost' ? '#ef4444' : '#10b981'}]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.iconLarge}>{a.icon}</Text>
                  <View style={styles.badgeCol}>
                    <View style={[styles.typeBadge, {backgroundColor: a.type === 'lost' ? '#450a0a' : '#052e16'}]}>
                      <Text style={[styles.typeText, {color: a.type === 'lost' ? '#f87171' : '#4ade80'}]}>
                        {a.type === 'lost' ? '🔍 LOST' : '✋ FOUND'}
                      </Text>
                    </View>
                    {a.reward && <View style={styles.rewardBadge}><Text style={styles.rewardText}>Reward: {a.reward}</Text></View>}
                  </View>
                </View>
                
                <Text style={styles.itemName}>{a.name}</Text>
                <Text style={styles.itemMeta}>{a.species} • {a.breed} • {a.color}</Text>
                <Text style={styles.itemMeta}>📍 {a.area} • 🕒 {a.date}</Text>
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Contact', `Calling ${a.contact}`)}>
                  <Text style={styles.actionBtnText}>📞 Contact {a.contact}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'vets' && VETS.map((v, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconBox}><Text style={{fontSize: 24}}>{v.icon}</Text></View>
              <View style={styles.cardBody}>
                <Text style={styles.itemName}>{v.name}</Text>
                <Text style={styles.itemMeta}>{v.spec} • 📍 {v.dist}</Text>
                <Text style={styles.itemMeta}>🕒 {v.timing}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Call', `Dialing ${v.phone}`)}>
              <Text style={styles.actionBtnText}>📞 {v.phone}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {activeTab === 'services' && SERVICES.map((s, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.iconLarge}>{s.icon}</Text>
            <Text style={styles.itemName}>{s.title}</Text>
            <Text style={[styles.itemMeta, {marginBottom: 16}]}>{s.desc}</Text>
            <View style={styles.serviceFooter}>
              <Text style={styles.price}>{s.price}</Text>
              <TouchableOpacity style={styles.bookBtn} onPress={() => Alert.alert('Book', 'Service Booked')}>
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Post Modal */}
      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Lost/Found Alert</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, form.type === 'lost' && styles.toggleBtnActiveL]} onPress={() => setForm({...form, type: 'lost'})}><Text style={form.type==='lost' ? styles.toggleTextActive : styles.toggleText}>Lost Pet</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, form.type === 'found' && styles.toggleBtnActiveF]} onPress={() => setForm({...form, type: 'found'})}><Text style={form.type==='found' ? styles.toggleTextActive : styles.toggleText}>Found Pet</Text></TouchableOpacity>
              </View>
              
              <Text style={styles.label}>Pet Name (or "Unknown") *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({...form, name: t})} />
              
              <Text style={styles.label}>Species (Dog, Cat, Bird...)</Text>
              <TextInput style={styles.input} value={form.species} onChangeText={t => setForm({...form, species: t})} />
              
              <Text style={styles.label}>Breed & Color</Text>
              <TextInput style={styles.input} placeholder="e.g. Persian, White" placeholderTextColor="#64748b" value={form.breed} onChangeText={t => setForm({...form, breed: t})} />
              
              <Text style={styles.label}>Last Seen Location</Text>
              <TextInput style={styles.input} value={form.area} onChangeText={t => setForm({...form, area: t})} />
              
              <Text style={styles.label}>Contact Phone *</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" value={form.contact} onChangeText={t => setForm({...form, contact: t})} />
              
              {form.type === 'lost' && (
                <>
                  <Text style={styles.label}>Reward (Optional)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 500" keyboardType="numeric" placeholderTextColor="#64748b" value={form.reward} onChangeText={t => setForm({...form, reward: t})} />
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handlePost}>
                <Text style={styles.submitBtnText}>Post Alert</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#3b82f6' },
  tabBtnText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#0f172a' },

  content: { padding: 16 },
  postBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  postBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconLarge: { fontSize: 40, marginBottom: 12 },
  badgeCol: { alignItems: 'flex-end', gap: 6 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 10, fontWeight: 'bold' },
  rewardBadge: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rewardText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' },
  
  itemName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardBody: { flex: 1 },
  
  serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ffffff', paddingTop: 16 },
  price: { color: '#3b82f6', fontSize: 18, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  bookBtnText: { color: '#0f172a', fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { color: '#64748b', fontSize: 24 },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  toggleBtnActiveL: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  toggleBtnActiveF: { backgroundColor: '#10b981', borderColor: '#10b981' },
  toggleText: { color: '#64748b', fontWeight: 'bold' },
  toggleTextActive: { color: '#0f172a', fontWeight: 'bold' },
  label: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 16 },
  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});

export default withRoleGuard(PetsModule, 'pets');
