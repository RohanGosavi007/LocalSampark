'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { 
  Package, MapPin, Navigation, Clock, Truck, 
  CheckCircle2, PhoneCall, Star, ShieldCheck, 
  ArrowRight, ShieldAlert, Check
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Dynamic import for map to avoid SSR issues
const OrderMap = dynamic(() => import('./components/OrderMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background-alt animate-pulse flex items-center justify-center rounded-3xl border border-border">
      <div className="flex flex-col items-center gap-2 text-text-muted">
        <Navigation className="w-6 h-6 animate-bounce" />
        <span className="font-bold">Loading Live Map...</span>
      </div>
    </div>
  )
});

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function OrderTrackingPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get Order ID from URL if available
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('id') || 'ORD-1234';

    // 1. Initial Fetch
    const fetchOrder = async () => {
      // In reality: await api.get(`/orders/${orderId}`)
      const initialMockData = {
          id: orderId,
          shop_name: 'Sharma Grocery & Daily Needs',
          total_amount: 540,
          status: 'out_for_delivery',
          delivery_type: 'delivery',
          tracking_otp: '4921',
          created_at: new Date().toISOString(),
          eta: '12 mins',
          items: [
              { name: 'Aashirvaad Atta 5kg', quantity: 1, price: 250 }, 
              { name: 'Amul Butter 500g', quantity: 2, price: 145 }
          ],
          driver: {
              name: 'Ramesh Kumar',
              rating: 4.8,
              phone: '+91 9876543210',
              vehicle: 'MH 12 AB 1234 (Hero Splendor)',
              image: 'https://ui-avatars.com/api/?name=Ramesh+Kumar&background=10b981&color=fff'
          },
          coords: {
              shop: [18.5793, 73.8780],
              user: [18.5710, 73.8820],
              driver: [18.5750, 73.8800]
          }
      };
      setOrder(initialMockData);
      setLoading(false);
    };

    fetchOrder();

    // 2. Supabase Realtime Subscription
    const channel = supabase.channel(`public:Order:${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Order', filter: `id=eq.${orderId}` }, (payload) => {
        setOrder(prev => {
            if(!prev) return prev;
            return { ...prev, status: payload.new.status.toLowerCase() };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'OrderTracking', filter: `orderId=eq.${orderId}` }, (payload) => {
        setOrder(prev => {
            if(!prev) return prev;
            return { 
                ...prev, 
                coords: { ...prev.coords, driver: [payload.new.currentLat, payload.new.currentLng] },
                eta: payload.new.estimatedArrival ? 'Updated ETA' : prev.eta
            };
        });
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
      return (
          <div className="min-h-screen bg-background flex flex-col">
              <Header />
              <div className="flex-1 flex justify-center items-center">
                  <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin"></div>
              </div>
          </div>
      );
  }

  if (!order) {
      return (
          <div className="min-h-screen bg-background flex flex-col">
              <Header />
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <Package className="w-24 h-24 text-text-muted/30 mb-6" />
                  <h2 className="text-2xl font-heading font-black mb-2 text-text">No Active Orders</h2>
                  <p className="text-text-muted mb-8 text-center max-w-sm">You don't have any orders currently in progress.</p>
                  <Button asChild><a href="/shops">Browse Shops</a></Button>
              </div>
              <Footer />
          </div>
      );
  }

  const steps = [
      { id: 'placed', label: 'Order Placed', icon: Package },
      { id: 'packing', label: 'Packing', icon: CheckCircle2 },
      { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
      { id: 'delivered', label: 'Delivered', icon: MapPin }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-6xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                  <h1 className="text-3xl lg:text-4xl font-heading font-black text-text mb-2">Track Order</h1>
                  <p className="text-text-muted font-medium flex items-center gap-2">
                      <span className="bg-background-alt px-2 py-1 rounded-md border border-border">#{order.id}</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </p>
              </div>
              <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> ETA: {order.eta}
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Tracking Info */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                  
                  {/* Status Timeline */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                      <h3 className="font-heading font-black text-xl mb-6 flex items-center gap-2">
                          <Navigation className="w-5 h-5 text-primary"/> Order Status
                      </h3>
                      
                      <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                          {steps.map((step, idx) => {
                              const isActive = idx <= currentStepIndex;
                              const isCurrent = idx === currentStepIndex;
                              const Icon = step.icon;
                              return (
                                  <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${isActive ? 'bg-primary text-white' : 'bg-background-alt text-text-muted'}`}>
                                          {isActive ? <Check className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-border" />}
                                      </div>
                                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)]">
                                          <div className={`p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-primary/5 border-primary shadow-sm' : isActive ? 'bg-background border-border opacity-80' : 'bg-background-alt border-transparent opacity-50'}`}>
                                              <div className="flex items-center gap-2 font-bold mb-1">
                                                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                                                  <span className={isActive ? 'text-text' : 'text-text-muted'}>{step.label}</span>
                                              </div>
                                              {isCurrent && <div className="text-xs text-primary font-medium">Currently in progress</div>}
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </motion.div>

                  {/* OTP Card */}
                  {order.delivery_type === 'delivery' && (order.status === 'out_for_delivery' || order.status === 'packing') && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-6 text-black shadow-lg relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 opacity-20">
                              <ShieldAlert className="w-32 h-32" />
                          </div>
                          <div className="relative z-10">
                              <h4 className="font-bold mb-1 flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Delivery PIN</h4>
                              <p className="text-sm font-medium opacity-90 mb-4">Share this PIN with the delivery agent to receive your order.</p>
                              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center">
                                  <span className="text-4xl font-black tracking-[0.5em] ml-[0.25em]">{order.tracking_otp}</span>
                              </div>
                          </div>
                      </motion.div>
                  )}

                  {/* Order Details */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                      <h3 className="font-heading font-black text-xl mb-4">Order Details</h3>
                      <div className="font-bold text-text mb-3 pb-3 border-b border-border">{order.shop_name}</div>
                      <div className="space-y-3 mb-4">
                          {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-text-muted font-medium">{item.quantity}x {item.name}</span>
                                  <span className="font-bold text-text">₹{item.price * item.quantity}</span>
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-border font-black text-lg">
                          <span>Total</span>
                          <span className="text-primary">₹{order.total_amount}</span>
                      </div>
                  </motion.div>
              </div>

              {/* Right Column: Map & Driver */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                  
                  {/* Live Map */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[400px] lg:h-[500px] rounded-3xl border border-border overflow-hidden shadow-sm relative">
                      <OrderMap coords={order.coords} status={order.status} />
                  </motion.div>

                  {/* Driver Details */}
                  {order.driver && order.status === 'out_for_delivery' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm flex flex-col sm:flex-row items-center gap-6">
                          <div className="relative">
                              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20">
                                  <img src={order.driver.image} alt={order.driver.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full p-1.5 shadow-sm">
                                  <Truck className="w-4 h-4 text-primary" />
                              </div>
                          </div>
                          
                          <div className="flex-1 text-center sm:text-left">
                              <h3 className="font-heading font-black text-xl mb-1">{order.driver.name}</h3>
                              <p className="text-sm text-text-muted font-medium mb-2">{order.driver.vehicle}</p>
                              <div className="flex items-center justify-center sm:justify-start gap-1 text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md w-fit mx-auto sm:mx-0">
                                  <Star className="w-3 h-3 fill-amber-500" /> {order.driver.rating}
                              </div>
                          </div>
                          
                          <div className="flex gap-3 w-full sm:w-auto">
                              <Button className="flex-1 sm:flex-none" icon={PhoneCall}>Call</Button>
                          </div>
                      </motion.div>
                  )}
              </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
