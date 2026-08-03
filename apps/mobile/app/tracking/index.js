import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator , StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { apiGet } from '../../src/lib/api';
import { ChevronLeft, Truck, Package, CheckCircle2, MapPin, Navigation, PhoneCall, Star } from 'lucide-react-native';

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const orderId = id || 'ORD-1234';
  const { socket, API_URL } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial order state from backend
    const fetchOrder = async () => {
      try {
        const data = await apiGet(`/orders/${orderId}`);
        if (data && data.success) {
          setOrder({
            id: data.order.id,
            shop_name: 'LocalSampark Shop',
            total_amount: data.order.total_amount,
            status: data.order.status.toLowerCase(),
            delivery_type: data.order.fulfillment_method?.toLowerCase() || 'delivery',
            tracking_otp: '4921',
            eta: '12 mins',
            items: [],
            driver: {
                name: 'Ramesh Kumar',
                rating: 4.8,
                vehicle: 'MH 12 AB 1234',
                image: 'https://ui-avatars.com/api/?name=Ramesh+Kumar&background=3b82f6&color=fff'
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch order", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    // Socket.io Realtime Subscription
    if (socket) {
      socket.emit('order:track', orderId);

      socket.on('order:status_update', (payload) => {
        if (payload.orderId === orderId) {
          setOrder(prev => {
            if(!prev) return prev;
            return { ...prev, status: payload.status.toLowerCase() };
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('order:status_update');
      }
    };
  }, [orderId, socket, API_URL]);

  if (loading) {
    return (
      <SafeAreaView style={s.s0}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const steps = [
    { id: 'placed', label: 'Order Placed', icon: Package },
    { id: 'packing', label: 'Packing', icon: CheckCircle2 },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: MapPin }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === order?.status);

  return (
    <SafeAreaView style={s.s1}>
      <View style={s.s2}>
        <TouchableOpacity onPress={() => router.back()} style={s.s3}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s4}>Track Order</Text>
      </View>

      <ScrollView style={s.s5}>
        
        {/* Header Info */}
        <View style={s.s6}>
          <View>
            <Text style={s.s7}>#{order?.id}</Text>
            <Text style={s.s8}>ETA: {order?.eta}</Text>
          </View>
          <View style={s.s9}>
            <Text style={s.s10}>Live Tracking Active</Text>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={s.s11}>
          <View style={s.s12}>
            <Navigation color="#3b82f6" size={20} />
            <Text style={s.s13}>Order Status</Text>
          </View>
          
          <View style={s.s14}>
            {steps.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;
              
              return (
                <View key={step.id} style={s.s15}>
                  <View style={s.s16}>
                    <View style={[s.s31, isActive ? s.s32 : s.s33]}>
                      <Icon color={isActive ? "#fff" : "#475569"} size={16} />
                    </View>
                    {idx < steps.length - 1 && (
                      <View style={[s.s34, isActive ? s.s35 : s.s36]} />
                    )}
                  </View>
                  <View style={[s.s37, isCurrent ? 'bg-blue-600/10 border-blue-500/50' : isActive ? s.s38 : s.s39]}>
                    <Text style={[s.s40, isActive ? s.s41 : s.s42]}>{step.label}</Text>
                    {isCurrent && <Text style={s.s17}>Currently in progress</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery PIN */}
        {order?.delivery_type === 'delivery' && (order?.status === 'out_for_delivery' || order?.status === 'packing') && (
          <View style={s.s18}>
            <Text style={s.s19}>Delivery PIN</Text>
            <Text style={s.s20}>Share this with the agent to receive your order.</Text>
            <View style={s.s21}>
              <Text style={s.s22}>{order.tracking_otp}</Text>
            </View>
          </View>
        )}

        {/* Driver Details */}
        {order?.driver && order?.status === 'out_for_delivery' && (
          <View style={s.s23}>
            <Image source={order.driver.image } style={s.s24}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
            <View style={s.s25}>
              <Text style={s.s26}>{order.driver.name}</Text>
              <Text style={s.s27}>{order.driver.vehicle}</Text>
              <View style={s.s28}>
                <Star color="#f59e0b" size={12} fill="#f59e0b" />
                <Text style={s.s29}>{order.driver.rating}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.s30}>
              <PhoneCall color="#3b82f6" size={20} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  s1: { flex: 1, backgroundColor: '#020617' },
  s2: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  s3: { marginRight: 16, padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s4: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  s5: { flex: 1, padding: 16 },
  s6: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  s7: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  s8: { color: '#94a3b8', fontWeight: '500' },
  s9: { backgroundColor: 'rgba(37,99,235,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  s10: { color: '#60a5fa', fontWeight: '700' },
  s11: { backgroundColor: '#0f172a', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
  s12: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  s13: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s14: { paddingLeft: 8 },
  s15: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  s16: { alignItems: 'center', marginRight: 16 },
  s17: { color: '#60a5fa', fontSize: 12, fontWeight: '700', marginTop: 4 },
  s18: { backgroundColor: '#f59e0b', padding: 24, borderRadius: 24, marginBottom: 24 },
  s19: { color: '#451a03', fontWeight: '700', fontSize: 18, marginBottom: 4 },
  s20: { color: '#78350f', fontSize: 14, marginBottom: 16 },
  s21: { backgroundColor: 'rgba(255,255,255,0.3)', padding: 16, borderRadius: 12, alignItems: 'center' },
  s22: { color: '#451a03', fontWeight: '900', fontSize: 30, letterSpacing: 8, marginLeft: 8 },
  s23: { backgroundColor: '#0f172a', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  s24: { width: 64, height: 64, borderRadius: 9999, marginRight: 16, borderWidth: 2, borderColor: '#3b82f6' },
  s25: { flex: 1 },
  s26: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s27: { color: '#94a3b8', fontSize: 14, marginBottom: 4 },
  s28: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  s29: { color: '#f59e0b', fontWeight: '700', fontSize: 12 },
  s30: { backgroundColor: 'rgba(37,99,235,0.2)', padding: 16, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  s31: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  s32: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  s33: { backgroundColor: '#1e293b', borderColor: '#334155' },
  s34: { width: 2, height: 32, marginTop: 8 },
  s35: { backgroundColor: '#2563eb' },
  s36: { backgroundColor: '#1e293b' },
  s37: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  s38: { backgroundColor: '#1e293b', borderColor: '#334155' },
  s39: { backgroundColor: '#0f172a', borderColor: 'transparent' },
  s40: { fontWeight: '700', fontSize: 16 },
  s41: { color: '#ffffff' },
  s42: { color: '#64748b' },
});
