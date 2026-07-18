import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Switch, TextInput } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileHomeChef() {
  const [viewMode, setViewMode] = useState('order'); // 'order' or 'chef'

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout Modal
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [checkoutData, setCheckoutData] = useState({ quantity: 1, applyDiscount: false, deliveryOption: 'pickup', dropoffLocation: '' });
  const [coinDiscountEnabled, setCoinDiscountEnabled] = useState(true);

  // Chef Posting State
  const [postForm, setPostForm] = useState({ mealName: '', description: '', isVeg: true, availablePlates: '10', price: '150' });

  useEffect(() => {
    fetchMeals();
    fetchAdminConfig();
  }, []);

  const fetchMeals = async () => {
    try {
      const res = await fetch(`${API_V1}/chef/meals`);
      const data = await res.json();
      if (data.success) setMeals(data.data);
    } catch(e) {}
    setLoading(false);
  };

  const fetchAdminConfig = async () => {
    try {
      const res = await fetch(`${API_V1}/chef/admin/coin-discount-status`);
      const data = await res.json();
      if (data.success) setCoinDiscountEnabled(data.data.enabled);
    } catch(e) {}
  };

  const handleOrderMeal = async () => {
    if (checkoutData.deliveryOption === 'delivery' && !checkoutData.dropoffLocation) {
      Alert.alert('Error', 'Please enter a drop-off location for the delivery agent.');
      return;
    }

    try {
      const payload = {
        quantity: checkoutData.quantity,
        applyDiscount: checkoutData.applyDiscount,
        deliveryOption: checkoutData.deliveryOption,
        dropoffLocation: checkoutData.dropoffLocation
      };
      const res = await fetch(`${API_V1}/chef/meals/${checkoutModal.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert(
          'Order Confirmed!', 
          `${data.message}\nTotal Paid to Chef: ₹${data.data.finalPrice}\n${data.data.deliveryJobId ? 'Delivery Agent Pinged!' : 'Ready for Pickup!'}`
        );
        setCheckoutModal(null);
        fetchMeals();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {}
  };

  const handlePostMeal = async () => {
    try {
      const res = await fetch(`${API_V1}/chef/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postForm)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Meal posted successfully!');
        setPostForm({ mealName: '', description: '', isVeg: true, availablePlates: '10', price: '150' });
        fetchMeals();
        setViewMode('order');
      } else {
        Alert.alert('Error', data.error || 'Only Verified Chefs can post meals.');
      }
    } catch (e) {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Chef Network</Text>
        <Text style={styles.subtitle}>Authentic Local Meals</Text>
      </View>

      <View style={{flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#ffffff', borderRadius: 8}}>
        <TouchableOpacity style={[styles.mainTab, viewMode === 'order' && styles.mainTabActive]} onPress={() => setViewMode('order')}>
          <Text style={[styles.mainTabText, viewMode === 'order' && styles.mainTabTextActive]}>Order Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainTab, viewMode === 'chef' && styles.mainTabActiveChef]} onPress={() => setViewMode('chef')}>
          <Text style={[styles.mainTabText, viewMode === 'chef' && styles.mainTabTextActive]}>Chef Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {viewMode === 'order' ? (
          <>
            {meals.length === 0 && <Text style={styles.emptyText}>No meals listed today. Check back later!</Text>}
            {meals.map(meal => (
          <View key={meal.id} style={styles.card}>
            <View style={styles.cardImageContainer}>
              <Text style={styles.cardImageEmoji}>{meal.is_veg ? '🥗' : '🍗'}</Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateBadgeText}>{meal.available_plates} Left</Text>
              </View>
            </View>
            
            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{meal.meal_name}</Text>
                <Text style={styles.priceText}>₹{meal.price}</Text>
              </View>
              
              <Text style={styles.cardDesc} numberOfLines={2}>{meal.description}</Text>
              
              <View style={styles.chefBadge}>
                <Text style={styles.chefBadgeText}>✅ Verified Chef: {meal.chef_name}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.orderBtn} 
                onPress={() => {
                  setCheckoutModal(meal);
                  setCheckoutData({ quantity: 1, applyDiscount: false, deliveryOption: 'pickup', dropoffLocation: '' });
                }}
              >
                <Text style={styles.orderBtnText}>Order Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
          </>
        ) : (
          <View style={{backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#ef4444'}}>
            <Text style={{color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 5}}>Post a New Meal</Text>
            <Text style={{color: '#ef4444', fontSize: 12, marginBottom: 20}}>Note: You must have the Verified Chef role.</Text>

            <Text style={styles.inputLabel}>Meal Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Rajma Chawal" placeholderTextColor="#64748b" value={postForm.mealName} onChangeText={t=>setPostForm({...postForm, mealName:t})} />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={styles.input} placeholder="Describe the dish..." placeholderTextColor="#64748b" value={postForm.description} onChangeText={t=>setPostForm({...postForm, description:t})} />
            
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Plates Available</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="10" placeholderTextColor="#64748b" value={postForm.availablePlates} onChangeText={t=>setPostForm({...postForm, availablePlates:t})} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Price (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="150" placeholderTextColor="#64748b" value={postForm.price} onChangeText={t=>setPostForm({...postForm, price:t})} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Type</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
              <TouchableOpacity style={[styles.toggleBtn, postForm.isVeg && {backgroundColor: '#22c55e', borderColor: '#22c55e'}]} onPress={() => setPostForm({...postForm, isVeg: true})}>
                <Text style={[styles.toggleBtnText, postForm.isVeg && {color: '#0f172a'}]}>🥬 Veg</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, !postForm.isVeg && {backgroundColor: '#ef4444', borderColor: '#ef4444'}]} onPress={() => setPostForm({...postForm, isVeg: false})}>
                <Text style={[styles.toggleBtnText, !postForm.isVeg && {color: '#0f172a'}]}>🍗 Non-Veg</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{backgroundColor: '#ef4444', padding: 15, borderRadius: 10, alignItems: 'center'}} onPress={handlePostMeal}>
              <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Publish Meal Feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Checkout Modal */}
      <Modal visible={!!checkoutModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            {checkoutModal && (
              <>
                <Text style={styles.modalTitle}>Checkout Order</Text>
                <Text style={styles.modalSubtitle}>{checkoutModal.meal_name}</Text>

                <View style={styles.qtyBox}>
                  <Text style={styles.qtyLabel}>Quantity (Plates)</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => setCheckoutData({...checkoutData, quantity: Math.max(1, checkoutData.quantity - 1)})} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                    <Text style={styles.qtyText}>{checkoutData.quantity}</Text>
                    <TouchableOpacity onPress={() => setCheckoutData({...checkoutData, quantity: Math.min(checkoutModal.available_plates, checkoutData.quantity + 1)})} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                  </View>
                </View>

                {coinDiscountEnabled && (
                  <View style={styles.discountBox}>
                    <View style={{flex: 1}}>
                      <Text style={styles.discountText}>Apply Coin Discount</Text>
                      <Text style={styles.discountSubtext}>Deducts {100 * checkoutData.quantity} 🪙 for ₹{10 * checkoutData.quantity} off</Text>
                    </View>
                    <Switch 
                      value={checkoutData.applyDiscount} 
                      onValueChange={v=>setCheckoutData({...checkoutData, applyDiscount:v})} 
                      trackColor={{ false: "#334155", true: "#818cf8" }}
                      thumbColor={checkoutData.applyDiscount ? "#4f46e5" : "#94a3b8"}
                    />
                  </View>
                )}

                <Text style={styles.inputLabel}>How will you get your food?</Text>
                <View style={styles.deliveryToggleRow}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, checkoutData.deliveryOption === 'pickup' && styles.toggleBtnActivePickup]}
                    onPress={() => setCheckoutData({...checkoutData, deliveryOption: 'pickup'})}
                  >
                    <Text style={[styles.toggleBtnText, checkoutData.deliveryOption === 'pickup' && styles.toggleBtnTextActive]}>🚶 Pickup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, checkoutData.deliveryOption === 'delivery' && styles.toggleBtnActiveDelivery]}
                    onPress={() => setCheckoutData({...checkoutData, deliveryOption: 'delivery'})}
                  >
                    <Text style={[styles.toggleBtnText, checkoutData.deliveryOption === 'delivery' && styles.toggleBtnTextActive]}>🛵 Ping Delivery</Text>
                  </TouchableOpacity>
                </View>

                {checkoutData.deliveryOption === 'delivery' && (
                  <View style={{marginTop: 15}}>
                    <Text style={styles.inputLabel}>Drop-off Location</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. B-Block, Flat 204"
                      placeholderTextColor="#64748b"
                      value={checkoutData.dropoffLocation}
                      onChangeText={t=>setCheckoutData({...checkoutData, dropoffLocation:t})}
                    />
                    <Text style={styles.deliveryNotice}>Requires flat ₹30 cash to Agent on arrival.</Text>
                  </View>
                )}

                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Subtotal ({checkoutData.quantity} plates):</Text>
                    <Text style={styles.receiptValue}>₹{checkoutModal.price * checkoutData.quantity}</Text>
                  </View>
                  {checkoutData.applyDiscount && coinDiscountEnabled && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabelCoin}>Coin Discount:</Text>
                      <Text style={styles.receiptValueCoin}>-₹{10 * checkoutData.quantity}</Text>
                    </View>
                  )}
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Pay Chef Now:</Text>
                    <Text style={styles.receiptTotalValue}>
                      ₹{(checkoutModal.price * checkoutData.quantity) - (checkoutData.applyDiscount && coinDiscountEnabled ? (10 * checkoutData.quantity) : 0)}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutModal(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleOrderMeal}>
                    <Text style={styles.confirmBtnText}>Confirm Order</Text>
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
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ef4444' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  mainTab: { flex: 1, padding: 12, alignItems: 'center' },
  mainTabActive: { backgroundColor: '#7f1d1d', borderRadius: 8 },
  mainTabActiveChef: { backgroundColor: '#b91c1c', borderRadius: 8 },
  mainTabText: { color: '#64748b', fontWeight: 'bold' },
  mainTabTextActive: { color: '#0f172a' },

  content: { padding: 20 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },

  card: { backgroundColor: '#ffffff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardImageContainer: { backgroundColor: '#7f1d1d', height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardImageEmoji: { fontSize: 50 },
  plateBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#ef4444' },
  plateBadgeText: { color: '#fca5a5', fontSize: 11, fontWeight: 'bold' },
  cardBody: { padding: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', flex: 1 },
  priceText: { color: '#34d399', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  cardDesc: { color: '#64748b', fontSize: 13, marginBottom: 15 },
  chefBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', marginBottom: 15 },
  chefBadgeText: { color: '#60a5fa', fontSize: 12, fontWeight: 'bold' },
  orderBtn: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  orderBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, color: '#f97316', fontWeight: 'bold', marginBottom: 20 },
  
  qtyBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  qtyLabel: { color: '#64748b', fontSize: 14 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  qtyBtn: { backgroundColor: '#e2e8f0', width: 35, height: 35, borderRadius: 17.5, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  qtyText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },

  discountBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.1)', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  discountText: { color: '#c7d2fe', fontSize: 14, fontWeight: 'bold' },
  discountSubtext: { color: '#818cf8', fontSize: 11, marginTop: 2 },
  
  inputLabel: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  deliveryToggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  toggleBtnActivePickup: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  toggleBtnActiveDelivery: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleBtnText: { color: '#64748b', fontWeight: 'bold' },
  toggleBtnTextActive: { color: '#0f172a' },

  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: '#0f172a' },
  deliveryNotice: { color: '#60a5fa', fontSize: 11, marginTop: 5 },

  receiptBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginTop: 20, marginBottom: 15 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  receiptLabel: { color: '#64748b' },
  receiptValue: { color: '#0f172a' },
  receiptLabelCoin: { color: '#818cf8' },
  receiptValueCoin: { color: '#818cf8', fontWeight: 'bold' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  receiptTotalLabel: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  receiptTotalValue: { color: '#10b981', fontSize: 18, fontWeight: 'bold' },
  
  modalActions: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, backgroundColor: '#e2e8f0', padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#0f172a', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#ef4444', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#0f172a', fontWeight: 'bold' },
});
