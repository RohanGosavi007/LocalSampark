import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import {
  Store,
  ShoppingCart,
  Calendar,
  Clock,
  CheckCircle,
  MapPin,
  Star,
  Plus,
  Minus,
  CreditCard,
  User,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';
import { theme } from '../../theme/theme';
import SkeletonLoader from '../../components/SkeletonLoader';
import BouncyButton from '../../components/BouncyButton';
import VisitorViewRouter from './components/VisitorViewRouter';
import { socketService } from '../../services/socket';

const API_BASE = 'http://10.0.2.2:5000/api/v1'; // Android emulator localhost alias

export default function DynamicSuperAppShopScreen({ route, navigation }) {
  const shopId = route?.params?.shopId || 'cmsftcjqn0026c7m8afsykuzo';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const router = useRouter();

  // Global Cart State
  const { items: cart, addItem: addToCart, updateQuantity, getCartTotal } = useCartStore();
  const cartTotalPaise = getCartTotal() * 100; // Store uses rupee, converting to paise for UI or keeping it consistent

  // Appointment State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchShopData();
    
    // Connect and join WebSocket room for this shop
    socketService.connect();
    socketService.joinShopRoom(shopId);

    const handleInventoryUpdate = (data) => {
      // Re-fetch shop data to get latest inventory safely
      // Or manually mutate state if preferred
      if (data && data.itemId) {
        fetchShopData();
      }
    };

    socketService.on('inventory_update', handleInventoryUpdate);

    return () => {
      socketService.off('inventory_update', handleInventoryUpdate);
    };
  }, [shopId]);

  async function fetchShopData() {
    try {
      setLoading(true);
      const [res, univRes] = await Promise.all([
        fetch(`${API_BASE}/shops/${shopId}`),
        fetch(`${API_BASE}/universal-catalog/${shopId}`).catch(() => null)
      ]);
      const json = await res.json();
      const univJson = univRes ? await univRes.json() : { items: [] };

      if (json.success) {
        // Merge universal items
        const univItems = univJson.items || [];
        const univProducts = univItems.filter(i => i.item_type === 'physical_good').map(i => ({...i, name: i.title, pricePaise: i.price * 100}));
        const univServices = univItems.filter(i => i.item_type !== 'physical_good').map(i => ({...i, serviceName: i.title, pricePaise: i.price * 100, durationMinutes: 30}));

        json.shop = json.shop || {};
        json.shop.products = [...(json.shop.products || []), ...univProducts];
        json.shop.serviceSlots = [...(json.shop.serviceSlots || []), ...univServices];

        setData(json);
        if (json.shop.categoryType === 'APPOINTMENT' || json.shop.business_model === 'appointment') {
          setActiveTab('appointment');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  }

  const updateCartQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (item) {
      updateQuantity(productId, item.quantity + delta);
    }
  };

  // Appointment Booking Submission
  const handleBooking = async () => {
    if (!selectedSlot) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/universal-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: data.shop.id,
          orderType: 'booking',
          totalAmount: selectedSlot.pricePaise ? selectedSlot.pricePaise / 100 : 0,
          items: [{ id: selectedSlot.id, quantity: 1, price: selectedSlot.pricePaise ? selectedSlot.pricePaise / 100 : 0 }],
          notes: 'Payment: COD'
        }),
      });

      const json = await res.json();
      if (json.success) {
        Alert.alert('Booking Confirmed!', `Order ID: ${json.orderId}`);
        setSelectedSlot(null);
        fetchShopData();
      } else {
        Alert.alert('Booking Failed', json.error);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <SkeletonLoader type="list" count={5} />
      </View>
    );
  }

  if (!data) return null;

  const { shop, products, serviceSlots, availableServices } = data;
  const isHybrid = shop.categoryType === 'HYBRID';

  return (
    <View style={s.container}>
      {/* Header Banner */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>{shop.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={s.shopName}>{shop.name}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{shop.categoryType}</Text>
              </View>
            </View>
            <Text style={s.subText}>{shop.category.name} • Rating: {shop.rating} ★</Text>
            <Text style={s.locationText}>{shop.address.locality}, {shop.address.city}</Text>
          </View>
        </View>

        {/* HYBRID Tab Switcher */}
        {isHybrid && (
          <View style={s.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab('products')}
              style={[s.tabButton, activeTab === 'products' && s.activeTabButton]}
            >
              <Text style={[s.tabText, activeTab === 'products' && s.activeTabText]}>Products ({products.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('appointment')}
              style={[s.tabButton, activeTab === 'appointment' && s.activeTabButton]}
            >
              <Text style={[s.tabText, activeTab === 'appointment' && s.activeTabText]}>Book Service</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <VisitorViewRouter 
          shop={shop} 
          products={products} 
          services={availableServices} 
          serviceSlots={serviceSlots}
          onBook={async (slotId, payload) => {
            try {
              setIsSubmitting(true);
              const res = await fetch(`${API_BASE}/universal-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shopId: shop.id,
                  orderType: 'booking',
                  totalAmount: 0, // Fallback, real price depends on service
                  items: [{ id: slotId, quantity: 1, price: 0, metaData: payload }],
                  notes: 'Payment: COD'
                }),
              });
              const json = await res.json();
              if (json.success) {
                Alert.alert('Booking Confirmed!', `Order ID: ${json.orderId}`);
                fetchShopData();
              } else {
                Alert.alert('Booking Failed', json.message || json.error);
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setIsSubmitting(false);
            }
          }}
          categories={data.categories || []} 
        />
      </ScrollView>

      {/* Floating Cart Bar for Mobile */}
      {cart.length > 0 && (
        <View style={s.cartBar}>
          <View>
            <Text style={s.cartCount}>{cart.length} ITEMS</Text>
            <Text style={s.cartTotal}>₹{((cartTotalPaise + 3500) / 100).toFixed(2)}</Text>
          </View>
          <BouncyButton onPress={() => router.push('/modules/checkout')} style={s.checkoutBtn} scaleTo={0.95}>
            <Text style={s.checkoutBtnText}>Checkout</Text>
          </BouncyButton>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 14 },
  header: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 48, height: 48, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 20 },
  shopName: { color: theme.colors.textPrimary, ...theme.typography.h2 },
  badge: { marginLeft: 8, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  subText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  locationText: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 2 },
  tabContainer: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  sectionTitle: { color: theme.colors.textPrimary, ...theme.typography.h3, marginBottom: 12 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...theme.shadows.sm, borderWidth: 1, borderColor: theme.colors.border },
  productName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },
  productPrice: { color: theme.colors.primary, fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  addBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.sm },
  addBtnText: { color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 12 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: 4 },
  qtyBtn: { padding: 4 },
  qtyText: { color: theme.colors.primary, fontWeight: 'bold', marginHorizontal: 8 },
  serviceCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  selectedServiceCard: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  serviceTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },
  serviceSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 },
  servicePrice: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 8, borderRadius: theme.borderRadius.md, width: '31%', alignItems: 'center' },
  selectedSlotBtn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  disabledSlotBtn: { opacity: 0.3 },
  slotTime: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: 'bold' },
  slotDate: { color: theme.colors.textSecondary, fontSize: 10 },
  confirmBookingBtn: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: theme.borderRadius.lg, marginTop: 20, alignItems: 'center' },
  confirmBookingBtnText: { color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 14 },
  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...theme.shadows.lg },
  cartCount: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  cartTotal: { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  checkoutBtnText: { color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xxl, borderTopRightRadius: theme.borderRadius.xxl, padding: theme.spacing.xl },
  modalTitle: { color: theme.colors.textPrimary, ...theme.typography.h2 },
  modalSub: { color: theme.colors.textSecondary, fontSize: 14, marginVertical: 12 },
  payNowBtn: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: theme.borderRadius.lg, alignItems: 'center', marginTop: 12 },
  payNowBtnText: { color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 14 },
  closeBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: theme.colors.error, fontSize: 14 },
});
