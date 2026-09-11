import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Modal, Switch, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { apiGet, apiPost, apiPut } from '../../src/lib/api';

// Memoized Product Card for zero-allocation Recycling
const ProductCard = React.memo(({ prod, onToggleStatus, onOpenEditor }) => {
  return (
    <View style={[styles.productCard, !prod.active && styles.inactiveCard]}>
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
          onValueChange={() => onToggleStatus(prod.id)}
          trackColor={{ false: '#334155', true: '#3b82f6' }}
        />
        <TouchableOpacity style={styles.editBtn} onPress={() => onOpenEditor(prod)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) => (
  prev.prod.id === next.prod.id &&
  prev.prod.active === next.prod.active &&
  prev.prod.stock === next.prod.stock &&
  prev.prod.price === next.prod.price &&
  prev.prod.name === next.prod.name &&
  prev.prod.category === next.prod.category
));

export default function ProductsScreen() {
  // This screen seeded its inventory from a literal array — "Amul Taaza Milk
  // 500ml ₹28, 15 in stock", "Aashirvaad Atta 5kg ₹240", "Maggi 2-Min Noodles"
  // — so every shop owner opened their Products tab to three branded items they
  // do not stock, presented as their own inventory.
  //
  // Worse than the wrong data: there was no API call anywhere in this file.
  // Add, edit and the active toggle all wrote to local state only, so a
  // merchant could spend ten minutes correcting their catalogue, watch it
  // update on screen, and lose every keystroke on unmount. The backend has had
  // full CRUD the whole time (GET /shops/:id/products, POST/PUT
  // /shops/my-shop/products) and this screen called none of it.
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState(null);

  const loadProducts = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(null);
    try {
      // my-shop resolves the caller's own shop from their token, which is how
      // the other merchant screens in this app already work.
      const shop = await apiGet('/shops/my-shop');
      const resolved = shop?.shop?.id ?? shop?.id ?? null;
      setShopId(resolved);

      if (!resolved) {
        setProducts([]);
        setLoadError('No shop is linked to this account yet.');
        return;
      }

      const res = await apiGet(`/shops/${resolved}/products`);
      const rows = res?.products ?? res?.data ?? (Array.isArray(res) ? res : []);
      setProducts(
        rows.map((p) => ({
          id: String(p.id),
          name: p.name ?? '',
          category: p.category ?? p.category_name ?? '',
          // Some tables store paise, others rupees; the editor works in rupees.
          price: String(p.price ?? (p.pricePaise != null ? p.pricePaise / 100 : '')),
          // shop_products carries stock in two columns that the backend keeps in
          // step: stock_quantity is what the storefront reads, inventory_count
          // is what checkout decrements.
          stock: Number(p.stock_quantity ?? p.inventory_count ?? p.stock ?? 0),
          // is_available is the flag the storefront listing filters on, so it is
          // what "listed / unlisted" means to a customer. is_active is the
          // dashboard-side mirror of it.
          active: (p.is_available ?? p.is_active ?? 1) ? true : false,
        }))
      );
    } catch (err) {
      // An empty list and a stated reason — never invented stock.
      setProducts([]);
      setLoadError(err?.message || 'Could not load your products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  
  const [isEditorVisible, setEditorVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '' });

  const openEditor = useCallback((prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setForm({ name: prod.name, category: prod.category, price: prod.price, stock: String(prod.stock) });
    } else {
      setEditingProduct(null);
      setForm({ name: '', category: '', price: '', stock: '' });
    }
    setEditorVisible(true);
  }, []);

  const saveProduct = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Give the product a name before saving.');
      return;
    }
    if (!shopId) {
      Alert.alert('No shop linked', 'This account is not linked to a shop yet.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price) || 0,
      stock_quantity: parseInt(form.stock, 10) || 0,
    };

    setSaving(true);
    try {
      if (editingProduct) {
        await apiPut(`/shops/my-shop/products/${editingProduct.id}`, payload);
      } else {
        await apiPost('/shops/my-shop/products', payload);
      }
      setEditorVisible(false);
      // Re-read rather than patching local state, so what is on screen is what
      // the server actually stored.
      await loadProducts({ isRefresh: true });
    } catch (err) {
      // The editor stays open with the user's input intact, so nothing is lost.
      Alert.alert('Could not save', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [editingProduct, form, shopId, loadProducts]);

  const toggleStatus = useCallback(async (id) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const next = !current.active;

    // Optimistic, then reconciled. Listing a product on or off should feel
    // instant, but it must not silently disagree with the server the way the
    // old local-only version always did.
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: next } : p)));
    try {
      // is_available is the column the storefront listing filters on; the
      // backend moves is_active with it so the two views cannot disagree.
      await apiPut(`/shops/my-shop/products/${id}`, { is_available: next });
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: current.active } : p)));
      Alert.alert('Could not update', err?.message || 'The change was not saved.');
    }
  }, [products]);

  const renderItem = useCallback(({ item }) => (
    <ProductCard 
      prod={item} 
      onToggleStatus={toggleStatus} 
      onOpenEditor={openEditor} 
    />
  ), [toggleStatus, openEditor]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products & Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openEditor()}>
          <Text style={styles.addBtnText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#3b82f6" />
          </View>
        ) : (
          <FlashList
            data={products}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            estimatedItemSize={90}
            getItemType={() => 'product_card'}
            contentContainerStyle={{ paddingVertical: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadProducts({ isRefresh: true })}
                tintColor="#3b82f6"
              />
            }
            ListEmptyComponent={
              <View style={styles.stateBox}>
                <Text style={styles.stateTitle}>
                  {loadError ? 'Could not load your products' : 'No products yet'}
                </Text>
                <Text style={styles.stateBody}>
                  {loadError || 'Tap "+ Add New" to list your first product.'}
                </Text>
                {loadError ? (
                  <TouchableOpacity style={styles.retryBtn} onPress={() => loadProducts({ isRefresh: true })}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        )}
      </View>

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
              {/* Disabled while the write is in flight: the save is now a real
                  network call, so a double-tap would otherwise create the
                  product twice. */}
              <TouchableOpacity
                style={[styles.btn, styles.saveBtn, saving && styles.btnDisabled]}
                onPress={saveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Save Product</Text>
                )}
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
  btnDisabled: { opacity: 0.6 },
  // Loading, empty and error states — this screen previously had none, because
  // it never talked to a server and so could never be loading or failing.
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 8 },
  stateTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
  stateBody: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#3b82f6' },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});
