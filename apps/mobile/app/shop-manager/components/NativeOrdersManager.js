import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, LayoutAnimation, UIManager, Platform , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Package, CheckCircle2, XCircle, Truck, Search, Bell, MapPin, Phone, CreditCard, MessageCircle, ChevronDown, ChevronUp, Timer, ArrowRight } from 'lucide-react-native';
import { apiGet, apiPut } from '../../../src/lib/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ORDER_STATUS_CONFIG = {
  pending:          { label: 'New',            color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Bell,        action: 'Accept',   nextStatus: 'accepted' },
  accepted:         { label: 'Accepted',       color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: CheckCircle2,  action: 'Prepare', nextStatus: 'preparing' },
  preparing:        { label: 'Preparing',      color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: Timer,        action: 'Ready', nextStatus: 'ready_for_pickup' },
  ready_for_pickup: { label: 'Ready',          color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', icon: Package,      action: 'Dispatch',  nextStatus: 'dispatched' },
  dispatched:       { label: 'Dispatched',     color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: Truck,        action: 'Delivered', nextStatus: 'delivered' },
  delivered:        { label: 'Delivered',      color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: CheckCircle2,  action: null,        nextStatus: null },
  cancelled:        { label: 'Cancelled',      color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircle,      action: null,        nextStatus: null },
};

const STATUS_TABS = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'dispatched', 'delivered', 'cancelled'];

export default function NativeOrdersManager() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const fetchOrders = useCallback(async (status, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet(`/shops/my-shop/orders?status=${status}&limit=50`);
      if (data && data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const data = await apiPut(`/shops/my-shop/orders/${orderId}/status`, { status: newStatus });
      if (data && data.success) {
        // Animate out the order
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err) {
      console.warn('Failed to update order status:', err);
      alert('Could not update order status.');
    }
  };

  const handleReject = async (orderId) => {
    handleStatusUpdate(orderId, 'cancelled');
  };

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.id?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q)
    );
  }, [orders, searchQuery]);

  const formatTimeSince = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  const renderStatusTabs = () => (
    <View style={s.s0}>
      <FlashList estimatedItemSize={100}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_TABS}
        keyExtractor={item => item}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const config = ORDER_STATUS_CONFIG[item];
          const isActive = activeTab === item;
          const Icon = config.icon;
          return (
            <TouchableOpacity
              onPress={() => setActiveTab(item)}
              style={{ backgroundColor: isActive ? config.bg : 'transparent', borderColor: isActive ? config.color : '#334155' }}
              style={[s.s40, !(isActive) && s.s41]}
            >
              <Icon size={14} color={isActive ? config.color : '#94a3b8'} style={{ marginRight: 6 }} />
              <Text style={{ color: isActive ? config.color : '#94a3b8' }} style={s.s1}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderOrderCard = ({ item }) => {
    const config = ORDER_STATUS_CONFIG[item.status] || ORDER_STATUS_CONFIG.pending;
    const isExpanded = expandedOrderId === item.id;
    const Icon = config.icon;
    let orderItems = [];
    try { orderItems = JSON.parse(item.items || '[]'); } catch (e) {}

    return (
      <View style={{ borderColor: `${config.color}30` }} style={s.s2}>
        {/* Header */}
        <TouchableOpacity onPress={() => toggleExpand(item.id)} style={s.s3}>
          <View style={s.s4}>
            <View style={{ backgroundColor: config.bg }} style={s.s5}>
              <Icon size={20} color={config.color} />
            </View>
            <View>
              <View style={s.s6}>
                <Text style={s.s7}>#{item.id?.substring(0,8).toUpperCase()}</Text>
                <View style={{ backgroundColor: config.bg }} style={s.s8}>
                  <Text style={{ color: config.color }} style={s.s9}>
                    {item.order_type === 'dine_in' ? '🍽️ Dine-in' : item.delivery_type === 'delivery' ? '🚴 Delivery' : '🏃 Pickup'}
                  </Text>
                </View>
              </View>
              <Text style={s.s10}>{item.customer_name || 'Walk-in'} • {formatTimeSince(item.created_at)}</Text>
            </View>
          </View>
          <View style={s.s11}>
            <Text style={s.s12}>₹{item.total_amount || 0}</Text>
            {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={s.s13}>
            <Text style={s.s14}>Order Items</Text>
            {orderItems.map((prod, i) => (
              <View key={i} style={s.s15}>
                <Text style={s.s16}>{prod.quantity || 1}x {prod.name || prod.product_name || 'Item'}</Text>
                <Text style={s.s17}>₹{prod.price || 0}</Text>
              </View>
            ))}

            {item.special_instructions && (
              <View style={s.s18}>
                <Text style={s.s19}>Special Instructions</Text>
                <Text style={s.s20}>{item.special_instructions}</Text>
              </View>
            )}

            <View style={s.s21}>
              {item.delivery_address && (
                <View style={s.s22}>
                  <MapPin size={14} color="#3b82f6" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={s.s23}>{item.delivery_address}</Text>
                </View>
              )}
              {item.customer_phone && (
                <View style={s.s24}>
                  <Phone size={14} color="#22c55e" style={{ marginRight: 6 }} />
                  <Text style={s.s25}>{item.customer_phone}</Text>
                </View>
              )}
              <View style={s.s26}>
                <CreditCard size={14} color="#a855f7" style={{ marginRight: 6 }} />
                <Text style={s.s27}>{item.payment_method || 'COD'} • {item.payment_status || 'Pending'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.s28}>
              {item.status === 'pending' && (
                <TouchableOpacity
                  onPress={() => handleReject(item.id)}
                  style={s.s29}
                >
                  <Text style={s.s30}>Reject</Text>
                </TouchableOpacity>
              )}
              {config.action && (
                <TouchableOpacity
                  onPress={() => handleStatusUpdate(item.id, config.nextStatus)}
                  style={{ backgroundColor: config.color }}
                  style={s.s31}
                >
                  <Text style={s.s32}>{config.action}</Text>
                  <ArrowRight size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.s33}>
      {renderStatusTabs()}
      
      {/* Search Bar */}
      <View style={s.s34}>
        <View style={s.s35}>
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Search by order ID, name, phone..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.s36}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.s37}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={s.s38}>
          <Package size={48} color="#475569" />
          <Text style={s.s39}>No {ORDER_STATUS_CONFIG[activeTab]?.label} orders</Text>
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
          data={filteredOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(activeTab, true)} tintColor="#3b82f6" />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  s0: { marginBottom: 16 },
  s1: { fontWeight: '700', fontSize: 14 },
  s2: { backgroundColor: '#0f172a', borderWidth: 1, borderRadius: 16, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' },
  s3: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a' },
  s4: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  s5: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  s6: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  s7: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginRight: 8 },
  s8: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  s9: { fontSize: 10, fontWeight: '700' },
  s10: { color: '#94a3b8', fontSize: 12 },
  s11: { alignItems: 'flex-end', justifyContent: 'center' },
  s12: { color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  s13: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderColor: 'rgba(30,41,59,0.5)', paddingTop: 12 },
  s14: { color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  s15: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: 'rgba(30,41,59,0.3)' },
  s16: { color: '#cbd5e1', fontSize: 12, flex: 1, paddingRight: 8 },
  s17: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  s18: { marginTop: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 12, borderRadius: 12 },
  s19: { color: '#f59e0b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  s20: { color: 'rgba(251,191,36,0.8)', fontSize: 12 },
  s21: { marginTop: 12, gap: 8 },
  s22: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  s23: { color: '#94a3b8', fontSize: 12, flex: 1 },
  s24: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  s25: { color: '#22c55e', fontWeight: '500', fontSize: 12 },
  s26: { flexDirection: 'row', alignItems: 'center' },
  s27: { color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' },
  s28: { flexDirection: 'row', marginTop: 16, gap: 8 },
  s29: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginRight: 8 },
  s30: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  s31: { flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  s32: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginRight: 8 },
  s33: { flex: 1 },
  s34: { paddingHorizontal: 16, marginBottom: 16 },
  s35: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  s36: { flex: 1, color: '#ffffff', marginLeft: 8, fontSize: 14 },
  s37: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  s38: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, marginHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16 },
  s39: { color: '#64748b', fontWeight: '700', fontSize: 18 },
  s40: { flexDirection: 'row', alignItems: 'center', marginRight: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  s41: { backgroundColor: '#1e293b' },
});
