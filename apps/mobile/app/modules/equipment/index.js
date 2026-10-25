import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';

export default function MobileCommunityGarage() {
  const [tab, setTab] = useState('browse'); // browse, list, rentals
  const [items, setItems] = useState([]);
    const [myRentals, setMyRentals] = useState([]);
  // Rentals of the items this user lists: the owner confirms their return.
  const [ownerRentals, setOwnerRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newItem, setNewItem] = useState({ itemName: '', category: 'Tools', description: '', dailyPrice: '0', securityDeposit: '0' });

  // Booking Modal
  const [bookingModal, setBookingModal] = useState(null);
    const [bookingData, setBookingData] = useState({ days: '1' });

  useEffect(() => {
    fetchItems();
    if (tab === 'rentals') fetchMyRentals();
  }, [tab]);

  const fetchItems = async () => {
    try {
      const data = await apiGet('/equipment/listings');
      if (data.success) setItems(data.data);
    } catch(e) {}
    setLoading(false);
  };

    const fetchMyRentals = async () => {
    try {
      const [mine, owned] = await Promise.all([apiGet('/equipment/rentals/me'), apiGet('/equipment/rentals/owner')]);
      if (mine.success) setMyRentals(mine.data);
      if (owned.success) setOwnerRentals(owned.data);
    } catch(e) {}
  };

  const handleListEquipment = async () => {
    if (!newItem.itemName || !newItem.description) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }
    try {
      const payload = { ...newItem, dailyPrice: Number(newItem.dailyPrice), securityDeposit: Number(newItem.securityDeposit) };
      const data = await apiPost('/equipment/listings', payload);
      if (data.success) {
        Alert.alert('Published', data.message);
        setNewItem({ itemName: '', category: 'Tools', description: '', dailyPrice: '0', securityDeposit: '0' });
        fetchItems();
        setTab('browse');
      }
    } catch (err) {}
  };

  const handleRentEquipment = async () => {
    try {
            const data = await apiPost(`/equipment/rent/${bookingModal.id}`, { days: Number(bookingData.days) });
      Alert.alert('Success', data.message);
      setBookingModal(null);
      fetchItems();
    } catch (err) {
      Alert.alert('Could not rent', err.message || 'Please try again.');
    }
  };

    // The renter says the item is back; the deposit waits for the owner.
  const handleRequestReturn = async (rentalId) => {
    try {
      const data = await apiPost(`/equipment/rentals/${rentalId}/return`, {});
      Alert.alert('Return requested', data.message);
      fetchMyRentals();
    } catch (err) {
      Alert.alert('Error', err.message || 'Please try again.');
    }
  };

  // The owner confirms it is back: the rent is paid to them and the deposit refunded.
  const handleConfirmReturn = async (rentalId) => {
    try {
      const data = await apiPost(`/equipment/rentals/${rentalId}/confirm-return`, { damageDeduction: 0 });
      Alert.alert('Return confirmed', data.message);
      fetchMyRentals();
      fetchItems();
    } catch (err) {
      Alert.alert('Error', err.message || 'Please try again.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Garage</Text>
        <Text style={styles.subtitle}>Rent Tools & Gear</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'browse' && styles.activeTabBrowse]} onPress={() => setTab('browse')}>
          <Text style={[styles.tabText, tab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'list' && styles.activeTabList]} onPress={() => setTab('list')}>
          <Text style={[styles.tabText, tab === 'list' && styles.activeTabText]}>List Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'rentals' && styles.activeTabRentals]} onPress={() => setTab('rentals')}>
          <Text style={[styles.tabText, tab === 'rentals' && styles.activeTabText]}>My Rentals</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'browse' && (
          <>
            {items.length === 0 && <Text style={styles.emptyText}>No items available right now.</Text>}
            {items.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardImageContainer}>
                  <Text style={styles.cardImageEmoji}>{item.category === 'Tools' ? '🛠️' : '🏕️'}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.item_name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Owner:</Text>
                    <Text style={styles.metaValue}>{item.owner_name}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Daily Rent:</Text>
                    <Text style={[styles.metaValue, {color: '#34d399', fontWeight: 'bold'}]}>₹{item.daily_price}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Deposit:</Text>
                    <Text style={[styles.metaValue, {color: '#fbbf24'}]}>₹{item.security_deposit}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.bookBtn} 
                    onPress={() => setBookingModal(item)}
                  >
                    <Text style={styles.bookBtnText}>Request to Borrow</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'list' && (
          <View style={styles.formContainer}>
            <Text style={styles.formNote}>Earn money and build community trust by renting out your idle gear.</Text>
            
            <TextInput style={styles.input} placeholder="Item Name" placeholderTextColor="#64748b" value={newItem.itemName} onChangeText={t=>setNewItem({...newItem, itemName:t})} />
            
            <View style={styles.row}>
              <TouchableOpacity style={[styles.catBtn, newItem.category === 'Tools' && styles.catBtnActive]} onPress={() => setNewItem({...newItem, category: 'Tools'})}>
                <Text style={[styles.catBtnText, newItem.category === 'Tools' && styles.catBtnTextActive]}>Tools 🛠️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.catBtn, newItem.category === 'Outdoors' && styles.catBtnActive]} onPress={() => setNewItem({...newItem, category: 'Outdoors'})}>
                <Text style={[styles.catBtnText, newItem.category === 'Outdoors' && styles.catBtnTextActive]}>Outdoors 🏕️</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={[styles.input, styles.textArea]} placeholder="Description & Condition" placeholderTextColor="#64748b" multiline value={newItem.description} onChangeText={t=>setNewItem({...newItem, description:t})} />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.inputLabel}>Daily Rent (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={newItem.dailyPrice} onChangeText={t=>setNewItem({...newItem, dailyPrice:t})} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Security Deposit (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={newItem.securityDeposit} onChangeText={t=>setNewItem({...newItem, securityDeposit:t})} />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>Deposits are held safely in Escrow by LocalSampark during the rental.</Text>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleListEquipment}>
              <Text style={styles.submitBtnText}>Publish Listing</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'rentals' && (
          <View>
                        <Text style={styles.sectionTitle}>Items I'm Renting</Text>
            {myRentals.length === 0 && <Text style={styles.emptyText}>No rentals yet.</Text>}
            {myRentals.map(r => (
              <View key={r.id} style={styles.rentalCard}>
                <View style={styles.rentalHeader}>
                  <Text style={styles.rentalTitle}>{r.item_name}</Text>
                  <Text style={styles.rentalStatus}>{r.status === 'return_requested' ? 'Returning' : r.status === 'returned' ? 'Returned' : 'Active'}</Text>
                </View>
                <Text style={styles.rentalText}>Duration: {r.days} Days</Text>
                <Text style={styles.rentalText}>Deposit held: ₹{r.deposit_held}</Text>
                {r.status === 'active' && (
                  <TouchableOpacity style={styles.returnBtn} onPress={() => handleRequestReturn(r.id)}>
                    <Text style={styles.returnBtnText}>I've Returned It</Text>
                  </TouchableOpacity>
                )}
                {r.status === 'return_requested' && (
                  <View style={styles.waitingBox}>
                    <Text style={styles.waitingText}>Waiting for the owner to confirm the return...</Text>
                  </View>
                )}
              </View>
            ))}

            <Text style={styles.sectionTitle}>Rentals of My Items</Text>
            {ownerRentals.length === 0 && <Text style={styles.emptyText}>Nobody has rented your items yet.</Text>}
            {ownerRentals.map(r => (
              <View key={r.id} style={styles.rentalCard}>
                <View style={styles.rentalHeader}>
                  <Text style={styles.rentalTitle}>{r.item_name}</Text>
                  <Text style={styles.rentalStatus}>{r.status === 'returned' ? 'Returned' : r.status === 'return_requested' ? 'Return requested' : 'Out'}</Text>
                </View>
                <Text style={styles.rentalText}>Rented by {r.renter_name} for {r.days} days · rent ₹{r.total_amount}</Text>
                {r.status !== 'returned' && (
                  <TouchableOpacity style={styles.returnBtn} onPress={() => handleConfirmReturn(r.id)}>
                    <Text style={styles.returnBtnText}>Item Is Back — Release Deposit</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!bookingModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            {bookingModal && (
              <>
                <Text style={styles.modalTitle}>Borrow Gear</Text>
                <Text style={styles.modalSubtitle}>{bookingModal.item_name}</Text>

                <Text style={styles.inputLabel}>Rental Duration (Days)</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={bookingData.days} 
                  onChangeText={t=>setBookingData({...bookingData, days:t})} 
                />

                

                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Rent:</Text>
                                        <Text style={styles.receiptValue}>₹{bookingModal.daily_price * Number(bookingData.days)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Refundable Deposit:</Text>
                    <Text style={styles.receiptDeposit}>₹{bookingModal.security_deposit}</Text>
                  </View>
                  <View style={styles.receiptTotalRow}>
                                        <Text style={styles.receiptTotalLabel}>Paid from wallet:</Text>
                    <Text style={styles.receiptTotalValue}>
                      ₹{Number(bookingModal.security_deposit) + Number(bookingModal.daily_price) * Number(bookingData.days)}
                    </Text>
                  </View>
                </View>

                                <Text style={styles.escrowNotice}>The deposit is held and refunded to your wallet when the owner confirms the item is back.</Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleRentEquipment}>
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f59e0b' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#ffffff' },
  activeTabBrowse: { borderBottomColor: '#f97316' },
  activeTabList: { borderBottomColor: '#d97706' },
  activeTabRentals: { borderBottomColor: '#6366f1' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: '#0f172a' },

  content: { padding: 20 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },

  card: { backgroundColor: '#ffffff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardImageContainer: { backgroundColor: '#78350f', padding: 30, alignItems: 'center' },
  cardImageEmoji: { fontSize: 50 },
  cardBody: { padding: 15 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  cardDesc: { color: '#64748b', fontSize: 13, marginBottom: 15 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  metaLabel: { color: '#64748b', fontSize: 13 },
  metaValue: { color: '#475569', fontSize: 13 },
  bookBtn: { backgroundColor: '#f97316', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  bookBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  formContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15 },
  formNote: { color: '#475569', fontSize: 13, marginBottom: 20 },
  inputLabel: { color: '#64748b', fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#0f172a', marginBottom: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  catBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  catBtnActive: { backgroundColor: '#d97706', borderColor: '#d97706' },
  catBtnText: { color: '#64748b', fontWeight: 'bold' },
  catBtnTextActive: { color: '#0f172a' },
  infoBox: { padding: 15, backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)', marginBottom: 20 },
  infoBoxText: { color: '#fcd34d', fontSize: 12 },
  submitBtn: { backgroundColor: '#d97706', padding: 16, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },

  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  rentalCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  rentalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rentalTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  rentalStatus: { color: '#34d399', fontWeight: 'bold' },
  rentalText: { color: '#64748b', fontSize: 14, marginBottom: 5 },
  returnBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  returnBtnText: { color: '#0f172a', fontWeight: 'bold' },
  waitingBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  waitingText: { color: '#64748b', fontStyle: 'italic', fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, color: '#fbbf24', fontWeight: 'bold', marginBottom: 20 },
  discountBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.2)', padding: 15, borderRadius: 10, marginBottom: 15 },
  discountText: { color: '#c7d2fe', fontSize: 13, flex: 1 },
  receiptBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  receiptLabel: { color: '#64748b' },
  receiptValue: { color: '#0f172a' },
  strike: { textDecorationLine: 'line-through', color: '#64748b' },
  receiptCoinText: { color: '#818cf8', fontWeight: 'bold' },
  receiptDeposit: { color: '#fbbf24' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  receiptTotalLabel: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  receiptTotalValue: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  escrowNotice: { color: '#fca5a5', fontSize: 11, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, backgroundColor: '#e2e8f0', padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#0f172a', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#f97316', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#0f172a', fontWeight: 'bold' },
});
