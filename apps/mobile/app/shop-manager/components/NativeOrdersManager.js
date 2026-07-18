import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, TextInput, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Package, CheckCircle2, XCircle, Truck, Search, Bell, MapPin, Phone, CreditCard, MessageCircle, ChevronDown, ChevronUp, Timer, ArrowRight } from 'lucide-react-native';
import { apiGet, apiPut } from '../../../../src/lib/api';

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
    <View className="mb-4">
      <FlatList
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
              className={`flex-row items-center mr-3 px-4 py-2.5 rounded-xl border ${isActive ? '' : 'bg-slate-800'}`}
            >
              <Icon size={14} color={isActive ? config.color : '#94a3b8'} style={{ marginRight: 6 }} />
              <Text style={{ color: isActive ? config.color : '#94a3b8' }} className="font-bold text-sm">
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
      <View style={{ borderColor: `${config.color}30` }} className="bg-slate-900 border rounded-2xl mx-4 mb-4 overflow-hidden">
        {/* Header */}
        <TouchableOpacity onPress={() => toggleExpand(item.id)} className="p-4 flex-row justify-between items-center bg-slate-900">
          <View className="flex-row items-center flex-1">
            <View style={{ backgroundColor: config.bg }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
              <Icon size={20} color={config.color} />
            </View>
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-white font-bold text-sm mr-2">#{item.id?.substring(0,8).toUpperCase()}</Text>
                <View style={{ backgroundColor: config.bg }} className="px-2 py-0.5 rounded flex-row items-center">
                  <Text style={{ color: config.color }} className="text-[10px] font-bold">
                    {item.order_type === 'dine_in' ? '🍽️ Dine-in' : item.delivery_type === 'delivery' ? '🚴 Delivery' : '🏃 Pickup'}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-400 text-xs">{item.customer_name || 'Walk-in'} • {formatTimeSince(item.created_at)}</Text>
            </View>
          </View>
          <View className="items-end justify-center">
            <Text className="text-white font-black text-lg mb-1">₹{item.total_amount || 0}</Text>
            {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View className="px-4 pb-4 border-t border-slate-800/50 pt-3">
            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">Order Items</Text>
            {orderItems.map((prod, i) => (
              <View key={i} className="flex-row justify-between items-center py-1.5 border-b border-slate-800/30">
                <Text className="text-slate-300 text-xs flex-1 pr-2">{prod.quantity || 1}x {prod.name || prod.product_name || 'Item'}</Text>
                <Text className="text-slate-400 text-xs font-medium">₹{prod.price || 0}</Text>
              </View>
            ))}

            {item.special_instructions && (
              <View className="mt-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                <Text className="text-amber-500 text-[10px] font-bold uppercase mb-1">Special Instructions</Text>
                <Text className="text-amber-400/80 text-xs">{item.special_instructions}</Text>
              </View>
            )}

            <View className="mt-3 space-y-2">
              {item.delivery_address && (
                <View className="flex-row items-start mb-2">
                  <MapPin size={14} color="#3b82f6" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text className="text-slate-400 text-xs flex-1">{item.delivery_address}</Text>
                </View>
              )}
              {item.customer_phone && (
                <View className="flex-row items-center mb-2">
                  <Phone size={14} color="#22c55e" style={{ marginRight: 6 }} />
                  <Text className="text-green-500 font-medium text-xs">{item.customer_phone}</Text>
                </View>
              )}
              <View className="flex-row items-center">
                <CreditCard size={14} color="#a855f7" style={{ marginRight: 6 }} />
                <Text className="text-slate-400 text-xs capitalize">{item.payment_method || 'COD'} • {item.payment_status || 'Pending'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row mt-4 space-x-2">
              {item.status === 'pending' && (
                <TouchableOpacity
                  onPress={() => handleReject(item.id)}
                  className="flex-1 py-3 items-center justify-center rounded-xl border border-red-500/30 mr-2"
                >
                  <Text className="text-red-500 font-bold text-sm">Reject</Text>
                </TouchableOpacity>
              )}
              {config.action && (
                <TouchableOpacity
                  onPress={() => handleStatusUpdate(item.id, config.nextStatus)}
                  style={{ backgroundColor: config.color }}
                  className="flex-1 py-3 flex-row items-center justify-center rounded-xl"
                >
                  <Text className="text-white font-bold text-sm mr-2">{config.action}</Text>
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
    <View className="flex-1">
      {renderStatusTabs()}
      
      {/* Search Bar */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Search by order ID, name, phone..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white ml-2 text-sm"
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View className="items-center justify-center py-20 mx-4 border border-dashed border-slate-800 rounded-2xl">
          <Package size={48} color="#475569" className="mb-4" />
          <Text className="text-slate-500 font-bold text-lg">No {ORDER_STATUS_CONFIG[activeTab]?.label} orders</Text>
        </View>
      ) : (
        <FlatList
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
