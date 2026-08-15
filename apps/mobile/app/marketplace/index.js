import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet, TextInput, Modal, Alert, FlatList, RefreshControl, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Heart, Eye, MapPin, Tag, Send, Plus, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiGet, apiPost } from '../../src/lib/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;
const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair'];
const CONDITION_COLORS = { 'Like New': '#10b981', 'Excellent': '#6366f1', 'Good': '#f97316', 'Fair': '#eab308' };
const ICONS = { Electronics: '📱', Furniture: '🪑', 'Home Appliances': '🫧', 'Sports & Fitness': '🏏', 'Books & Stationery': '📚', Vehicles: '🚗', 'Kitchen & Dining': '🍳' };

export default function MarketplaceScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', price: '', category: '', condition: 'Good', description: '', is_negotiable: true });
  const [postSubmitted, setPostSubmitted] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/marketplace?sort=${sortBy}&limit=40`;
      if (selectedCat) url += `&category=${selectedCat}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      const data = await apiGet(url);
      setListings(data?.listings || data?.rows || []);
    } catch (e) { setListings([]); }
    setLoading(false);
  }, [sortBy, selectedCat, searchQ]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { apiGet('/marketplace/categories').then(d => setCategories(d?.categories || [])).catch(() => {}); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchListings(); setRefreshing(false); };

  const toggleSave = async (id) => {
    try {
      const data = await apiPost(`/marketplace/${id}/save`);
      setSavedIds(prev => { const n = new Set(prev); data?.saved ? n.add(id) : n.delete(id); return n; });
    } catch (e) {}
  };

  const openDetail = async (item) => {
    try {
      const data = await apiGet(`/marketplace/${item.id}`);
      setSelectedItem(data?.listing || item);
    } catch (e) { setSelectedItem(item); }
    setShowDetail(true);
  };

  const submitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    try {
      await apiPost(`/marketplace/${selectedItem.id}/offer`, { offer_amount: parseFloat(offerAmount) });
      setOfferSubmitted(true);
      setTimeout(() => { setShowOffer(false); setOfferSubmitted(false); setOfferAmount(''); }, 2000);
    } catch (e) { Alert.alert('Error', 'Failed to submit'); }
  };

  const handlePost = async () => {
    if (!postForm.title || !postForm.price) { Alert.alert('Error', 'Title and price required'); return; }
    try {
      await apiPost('/marketplace', { ...postForm, price: parseFloat(postForm.price) });
      setPostSubmitted(true);
      setTimeout(() => { setPostSubmitted(false); setTab('browse'); fetchListings(); }, 2000);
    } catch (e) { Alert.alert('Error', 'Failed to create listing'); }
  };

  const ListingCard = ({ item }) => {
    const photos = (() => { try { return typeof item.photo_urls === 'string' ? JSON.parse(item.photo_urls) : (item.photo_urls || []); } catch { return []; } })();
    const condColor = CONDITION_COLORS[item.condition] || '#888';
    const isSaved = savedIds.has(item.id);

    return (
      <TouchableOpacity style={s.listingCard} onPress={() => openDetail(item)} activeOpacity={0.85}>
        <View style={s.listingImage}>
          {photos.length > 0 ? (
            <Image source={{ uri: photos[0] }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 36 }}>{ICONS[item.category] || '📦'}</Text>
          )}
          <TouchableOpacity onPress={(e) => { toggleSave(item.id); }} style={s.heartBtn}>
            <Heart color={isSaved ? '#ef4444' : '#fff'} size={16} fill={isSaved ? '#ef4444' : 'transparent'} />
          </TouchableOpacity>
          {item.condition && <View style={[s.condBadge, { backgroundColor: condColor + '33' }]}><Text style={[s.condBadgeText, { color: condColor }]}>{item.condition}</Text></View>}
          <View style={s.viewsBadge}><Eye color="#fff" size={10} /><Text style={{ color: '#fff', fontSize: 9 }}>{item.views_count || 0}</Text></View>
        </View>
        <View style={s.listingContent}>
          {item.category && <Text style={s.catLabel}>{item.category}</Text>}
          <Text style={s.listingTitle} numberOfLines={2}>{item.title}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={s.listingPrice}>₹{(item.price || 0).toLocaleString()}</Text>
            {item.is_negotiable ? <Text style={{ color: '#eab308', fontSize: 9, fontWeight: '700' }}>Negotiable</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#7c3aed', '#6d28d9']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
        <Text style={s.headerTitle}>🛍️ Marketplace</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabBar}>
        {[{ k: 'browse', l: '🛍️ Browse' }, { k: 'post', l: '📸 Sell' }].map(t => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[s.tabItem, tab === t.k && s.tabItemActive]}>
            <Text style={[s.tabText, tab === t.k && s.tabTextActive]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ BROWSE ═══ */}
      {tab === 'browse' && (
        <>
          <View style={s.searchBox}>
            <Search color="#94a3b8" size={16} />
            <TextInput style={s.searchInput} placeholder="Search items..." placeholderTextColor="#94a3b8" value={searchQ} onChangeText={setSearchQ} returnKeyType="search" />
          </View>

          {/* Category pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
            <TouchableOpacity onPress={() => setSelectedCat('')} style={[s.filterPill, !selectedCat && s.filterPillActive]}>
              <Text style={[s.filterPillText, !selectedCat && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setSelectedCat(c.name)} style={[s.filterPill, selectedCat === c.name && s.filterPillActive]}>
                <Text style={[s.filterPillText, selectedCat === c.name && { color: '#fff' }]}>{c.icon} {c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.centerView}><ActivityIndicator size="large" color="#7c3aed" /></View>
          ) : (
            <FlatList data={listings} numColumns={2} keyExtractor={(item, i) => item.id || String(i)}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item }) => <ListingCard item={item} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
              ListEmptyComponent={
                <View style={s.centerView}><Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text><Text style={s.emptyTitle}>No items found</Text></View>
              }
            />
          )}
        </>
      )}

      {/* ═══ POST ═══ */}
      {tab === 'post' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {postSubmitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
              <Text style={s.sectionTitle}>Listing Created!</Text>
            </View>
          ) : (
            <View style={s.formCard}>
              <Text style={s.sectionTitle}>Sell Your Item</Text>
              <TextInput style={s.formInput} placeholder="Title *" placeholderTextColor="#94a3b8" value={postForm.title} onChangeText={v => setPostForm({...postForm, title: v})} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Price (₹) *" placeholderTextColor="#94a3b8" keyboardType="numeric" value={postForm.price} onChangeText={v => setPostForm({...postForm, price: v})} />
                <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Category" placeholderTextColor="#94a3b8" value={postForm.category} onChangeText={v => setPostForm({...postForm, category: v})} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setPostForm({...postForm, condition: c})} style={[s.filterPill, postForm.condition === c && s.filterPillActive]}>
                    <Text style={[s.filterPillText, postForm.condition === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[s.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Description" placeholderTextColor="#94a3b8" multiline value={postForm.description} onChangeText={v => setPostForm({...postForm, description: v})} />
              <TouchableOpacity onPress={handlePost} style={s.primaryBtn}><Text style={s.primaryBtnText}>Publish Listing 🚀</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {selectedItem && (
              <ScrollView>
                <View style={{ height: 180, backgroundColor: '#0f172a', borderRadius: 16, marginBottom: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  {(() => { const p = (() => { try { return typeof selectedItem.photo_urls === 'string' ? JSON.parse(selectedItem.photo_urls) : (selectedItem.photo_urls || []); } catch { return []; } })(); return p.length > 0 ? <Image source={{ uri: p[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 56 }}>{ICONS[selectedItem.category] || '📦'}</Text>; })()}
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  {selectedItem.condition && <View style={[s.condBadge, { backgroundColor: (CONDITION_COLORS[selectedItem.condition]||'#888')+'33', position: 'relative' }]}><Text style={[s.condBadgeText, { color: CONDITION_COLORS[selectedItem.condition] }]}>{selectedItem.condition}</Text></View>}
                  {selectedItem.category && <View style={[s.condBadge, { backgroundColor: '#7c3aed22', position: 'relative' }]}><Text style={[s.condBadgeText, { color: '#7c3aed' }]}>{selectedItem.category}</Text></View>}
                </View>

                <Text style={[s.sectionTitle, { marginBottom: 4 }]}>{selectedItem.title}</Text>
                <Text style={{ color: '#7c3aed', fontSize: 24, fontWeight: '900', marginBottom: 4 }}>₹{(selectedItem.price || 0).toLocaleString()}</Text>
                {selectedItem.is_negotiable ? <Text style={{ color: '#eab308', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>🤝 Price is negotiable</Text> : null}

                {selectedItem.description && <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 16 }}>{selectedItem.description}</Text>}

                <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed22', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#7c3aed', fontWeight: '800' }}>{(selectedItem.seller_name || 'S')[0]}</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 13 }}>{selectedItem.seller_name || 'Seller'}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>{selectedItem.zone || 'Local Area'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {selectedItem.is_negotiable && (
                    <TouchableOpacity onPress={() => { setOfferAmount(String(Math.round((selectedItem.price||1000)*0.85))); setShowOffer(true); }} style={[s.primaryBtn, { flex: 1, backgroundColor: '#f59504' }]}>
                      <Text style={s.primaryBtnText}>Make Offer</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => toggleSave(selectedItem.id)} style={s.saveBtn}>
                    <Heart color={savedIds.has(selectedItem.id) ? '#ef4444' : '#94a3b8'} size={20} fill={savedIds.has(selectedItem.id) ? '#ef4444' : 'transparent'} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={{ marginTop: 12, alignItems: 'center' }}><Text style={{ color: '#94a3b8', fontSize: 13 }}>Close</Text></TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══ OFFER MODAL ═══ */}
      <Modal visible={showOffer} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {offerSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}><Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text><Text style={s.sectionTitle}>Offer Sent!</Text></View>
            ) : (
              <>
                <Text style={s.sectionTitle}>Make an Offer</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Listed at: ₹{(selectedItem?.price||0).toLocaleString()}</Text>
                <TextInput style={[s.formInput, { fontSize: 28, fontWeight: '900', textAlign: 'center' }]} placeholder="₹ Your offer" placeholderTextColor="#94a3b8" keyboardType="numeric" value={offerAmount} onChangeText={setOfferAmount} />
                <TouchableOpacity onPress={submitOffer} style={[s.primaryBtn, { backgroundColor: '#f59504' }]}><Text style={s.primaryBtnText}>Submit Offer 🤝</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowOffer(false)} style={{ marginTop: 12, alignItems: 'center' }}><Text style={{ color: '#94a3b8' }}>Cancel</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#1e293b' },
  tabItemActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },

  listingCard: { width: CARD_W, backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  listingImage: { width: '100%', height: 120, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  heartBtn: { position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  condBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  condBadgeText: { fontSize: 9, fontWeight: '700' },
  viewsBadge: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  listingContent: { padding: 10 },
  catLabel: { color: '#7c3aed', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  listingTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  listingPrice: { color: '#7c3aed', fontSize: 16, fontWeight: '900' },

  formCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155' },
  formInput: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', fontSize: 14, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  saveBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
});
