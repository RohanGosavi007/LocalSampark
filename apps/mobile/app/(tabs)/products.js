import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal, Switch } from 'react-native';

export default function ProductsScreen() {
  const [products, setProducts] = useState([
    { id: '1', name: 'Amul Taaza Milk 500ml', category: 'Dairy', price: '28', stock: 15, active: true },
    { id: '2', name: 'Aashirvaad Atta 5kg', category: 'Groceries', price: '240', stock: 8, active: true },
    { id: '3', name: 'Maggi 2-Min Noodles', category: 'Snacks', price: '14', stock: 0, active: false }
  ]);
  
  const [isEditorVisible, setEditorVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '' });

  const openEditor = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setForm({ name: prod.name, category: prod.category, price: prod.price, stock: String(prod.stock) });
    } else {
      setEditingProduct(null);
      setForm({ name: '', category: '', price: '', stock: '' });
    }
    setEditorVisible(true);
  };

  const saveProduct = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...form, stock: parseInt(form.stock) || 0 } : p));
    } else {
      setProducts([...products, { id: Math.random().toString(), ...form, stock: parseInt(form.stock) || 0, active: true }]);
    }
    setEditorVisible(false);
  };

  const toggleStatus = (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products & Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openEditor()}>
          <Text style={styles.addBtnText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {products.map(prod => (
          <View key={prod.id} style={[styles.productCard, !prod.active && styles.inactiveCard]}>
            <View style={styles.prodDetails}>
              <Text style={styles.prodName}>{prod.name}</Text>
              <Text style={styles.prodCategory}>{prod.category}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.prodPrice}>₹{prod.price}</Text>
                <Text style={[styles.prodStock, prod.stock === 0 && { color: '#ef4444' }]}>
                  {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                </Text>
              </View>
            </View>
            
            <View style={styles.prodActions}>
              <Switch 
                value={prod.active} 
                onValueChange={() => toggleStatus(prod.id)}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
              />
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditor(prod)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Product Editor Modal */}
      <Modal visible={isEditorVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'New Product'}</Text>
            
            <Text style={styles.label}>Product Name</Text>
            <TextInput 
              style={styles.input} 
              value={form.name} 
              onChangeText={t => setForm({...form, name: t})} 
              placeholder="e.g. Amul Butter 100g"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Category</Text>
            <TextInput 
              style={styles.input} 
              value={form.category} 
              onChangeText={t => setForm({...form, category: t})}
              placeholder="e.g. Dairy"
              placeholderTextColor="#64748b"
            />

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.price} 
                  onChangeText={t => setForm({...form, price: t})}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stock Quantity</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.stock} 
                  onChangeText={t => setForm({...form, stock: t})}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setEditorVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={saveProduct}>
                <Text style={styles.btnText}>Save Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  
  listContainer: { padding: 16 },
  productCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  inactiveCard: { opacity: 0.6 },
  prodDetails: { flex: 1 },
  prodName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  prodCategory: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodPrice: { color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  prodStock: { color: '#64748b', fontSize: 13 },
  
  prodActions: { alignItems: 'flex-end', gap: 12 },
  editBtn: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#ffffff' },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  
  label: { color: '#64748b', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, color: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#3b82f6' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});
