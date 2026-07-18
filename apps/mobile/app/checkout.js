import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../src/store/cartStore';
import { useAuth } from '../src/context/AuthContext';
import { MapPin, CreditCard, CheckCircle2, ChevronLeft, Truck, Store, Plus } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { apiGet, apiPost } from '../src/lib/api';

export default function CheckoutScreen() {
  const router = useRouter();
  const { authToken } = useAuth();
  const { items, currentShopName, currentShopId, sessionId, getCartTotal, clearCart } = useCartStore();
  
  const [step, setStep] = useState(1); // 1: Delivery/Fulfillment, 2: Payment, 3: Success
  const [fulfillmentMethod, setFulfillmentMethod] = useState('DELIVERY');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // RAZORPAY, STRIPE, CASHFREE, COD
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [allowedPayments, setAllowedPayments] = useState(['RAZORPAY', 'STRIPE', 'CASHFREE', 'COD']);
  const [allowedFulfillments, setAllowedFulfillments] = useState(['DELIVERY', 'SELF_PICKUP']);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  useEffect(() => {
    if (authToken) {
      apiGet('/users/addresses')
      .then(data => {
        if (data && data.success && data.data && data.data.length > 0) {
          setSavedAddresses(data.data);
          const defaultAddr = data.data.find(a => a.is_default === 1) || data.data[0];
          setSelectedAddressId(defaultAddr.id);
          setAddress(defaultAddr.street_address + ', ' + defaultAddr.city);
          setPincode(defaultAddr.postal_code);
        }
      })
      .catch(err => console.error('Failed to fetch addresses', err));
    }
  }, [authToken]);

  useEffect(() => {
    if (!currentShopId) return;
    apiGet(`/shops/${currentShopId}`)
      .then(data => {
        if (data && data.category_details) {
          const payments = (data.category_details.allowed_payment_methods || 'RAZORPAY,STRIPE,CASHFREE,COD').split(',');
          const fulfillments = (data.category_details.allowed_fulfillment_methods || 'DELIVERY,SELF_PICKUP').split(',');
          setAllowedPayments(payments);
          setAllowedFulfillments(fulfillments);
          
          if (payments.length > 0 && !payments.includes(paymentMethod)) {
            setPaymentMethod(payments[0]);
          }
          if (fulfillments.length > 0 && !fulfillments.includes(fulfillmentMethod)) {
            setFulfillmentMethod(fulfillments[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch shop rules:', err));
  }, [currentShopId]);

  const total = getCartTotal();
  const deliveryFee = fulfillmentMethod === 'SELF_PICKUP' ? 0 : 50;
  const platformFee = 10;
  const finalTotal = total + deliveryFee + platformFee;

  const handlePlaceOrder = async () => {
    if (fulfillmentMethod === 'DELIVERY' && (!address || !pincode)) {
      Alert.alert('Incomplete', 'Please provide complete delivery address and pincode.');
      return;
    }

    setLoading(true);

    try {
      // 1. Hit Checkout API
      const data = await apiPost('/checkout', {
        sessionId,
        shopId: currentShopId,
        paymentMethod,
        fulfillmentMethod,
        deliveryLat: 0,
        deliveryLng: 0
      });

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to place order');
      }

      const generatedOrderId = data.order.id;

      // 2. Handle Payment Gateway
      if (paymentMethod === 'RAZORPAY') {
        const options = {
          description: `Order from ${currentShopName}`,
          image: 'https://i.imgur.com/3g7nmJC.png',
          currency: 'INR',
          key: data.paymentData.key || 'rzp_test_mock',
          amount: Math.round(finalTotal * 100),
          name: 'LocalSampark',
          order_id: data.paymentData.orderId,
          theme: { color: '#3b82f6' }
        };

        try {
          const rzpResponse = await RazorpayCheckout.open(options);
          
          // Verify signature on backend
          const verifyData = await apiPost('/checkout/verify', {
            orderId: generatedOrderId,
            razorpay_payment_id: rzpResponse.razorpay_payment_id,
            razorpay_order_id: rzpResponse.razorpay_order_id,
            razorpay_signature: rzpResponse.razorpay_signature
          });
          
          if (!verifyData || !verifyData.success) {
            throw new Error('Payment verification failed.');
          }

          // Payment Success
          setOrderId(generatedOrderId);
          clearCart();
          setStep(3);
        } catch (error) {
          Alert.alert('Payment Failed', `Error: ${error.code} | ${error.description}`);
          // Stay on payment screen so they can retry
        }
      } else if (paymentMethod === 'STRIPE' || paymentMethod === 'CASHFREE') {
        // Native Stripe/Cashfree implementation goes here. Simulating for now.
        Alert.alert('Simulated Success', `${paymentMethod} initialized and verified (Mock).`);
        setOrderId(generatedOrderId);
        clearCart();
        setStep(3);
      } else {
        // COD / Pay at store
        setOrderId(generatedOrderId);
        clearCart();
        setStep(3);
      }

    } catch (e) {
      console.error(e);
      Alert.alert('Checkout Error', e.message);
    }
    
    setLoading(false);
  };

  // --- UI Rendering ---
  
  if (step === 3) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center p-6">
        <View className="w-24 h-24 bg-green-500/10 rounded-full items-center justify-center mb-6">
          <CheckCircle2 color="#22c55e" size={48} />
        </View>
        <Text className="text-white text-3xl font-black mb-2">Order Confirmed!</Text>
        <Text className="text-slate-400 text-center mb-8">Thank you for supporting local business.</Text>
        
        <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full mb-8">
          <Text className="text-slate-500 text-sm mb-1">Order ID</Text>
          <Text className="text-white font-bold text-xl mb-4">{orderId}</Text>
          
          <Text className="text-slate-500 text-sm mb-1">Status</Text>
          <View className="flex-row items-center">
            {fulfillmentMethod === 'SELF_PICKUP' ? <Store color="#3b82f6" size={16} /> : <Truck color="#3b82f6" size={16} />}
            <Text className="text-blue-400 font-bold ml-2">Waiting for shop confirmation</Text>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-blue-600 w-full py-4 rounded-xl shadow-lg shadow-blue-500/20 items-center mb-4"
          onPress={() => router.replace(`/tracking?id=${orderId}`)}
        >
          <Text className="text-white font-bold text-lg">Track Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-slate-800 w-full py-4 rounded-xl items-center"
          onPress={() => router.replace('/')}
        >
          <Text className="text-white font-bold text-lg">Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">{step === 1 ? 'Fulfillment' : 'Payment'}</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        
        {step === 1 && (
          <View>
            <Text className="text-white font-bold text-lg mb-4">How to receive your order?</Text>
            <View className="flex-row gap-4 mb-8">
              {allowedFulfillments.includes('DELIVERY') && (
                <TouchableOpacity 
                  onPress={() => setFulfillmentMethod('DELIVERY')}
                  className={`flex-1 p-4 rounded-2xl border items-center justify-center ${fulfillmentMethod === 'DELIVERY' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                >
                  <Truck color={fulfillmentMethod === 'DELIVERY' ? '#3b82f6' : '#64748b'} size={32} className="mb-2" />
                  <Text className={`font-bold ${fulfillmentMethod === 'DELIVERY' ? 'text-blue-400' : 'text-slate-400'}`}>Delivery</Text>
                </TouchableOpacity>
              )}
              
              {allowedFulfillments.includes('SELF_PICKUP') && (
                <TouchableOpacity 
                  onPress={() => setFulfillmentMethod('SELF_PICKUP')}
                  className={`flex-1 p-4 rounded-2xl border items-center justify-center ${fulfillmentMethod === 'SELF_PICKUP' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                >
                  <Store color={fulfillmentMethod === 'SELF_PICKUP' ? '#3b82f6' : '#64748b'} size={32} className="mb-2" />
                  <Text className={`font-bold ${fulfillmentMethod === 'SELF_PICKUP' ? 'text-blue-400' : 'text-slate-400'}`}>Self Pickup</Text>
                </TouchableOpacity>
              )}
            </View>

            {fulfillmentMethod === 'DELIVERY' && (
              <View className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg mb-8">
                <Text className="text-white font-bold mb-4">Delivery Address</Text>
                
                {savedAddresses.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm mb-2">Saved Addresses</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                      {savedAddresses.map(addr => (
                        <TouchableOpacity
                          key={addr.id}
                          onPress={() => {
                            setSelectedAddressId(addr.id);
                            setAddress(addr.street_address + ', ' + addr.city);
                            setPincode(addr.postal_code);
                          }}
                          className={`mr-3 p-3 rounded-xl border ${selectedAddressId === addr.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}
                        >
                          <Text className="text-white font-bold">{addr.address_type.toUpperCase()}</Text>
                          <Text className="text-slate-400 text-xs mt-1">{addr.street_address}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text className="text-slate-400 text-sm mb-2">{savedAddresses.length > 0 ? 'Or enter new address' : 'Full Address'}</Text>
                <TextInput 
                  value={address}
                  onChangeText={(txt) => { setAddress(txt); setSelectedAddressId(null); }}
                  placeholder="House No, Building, Street..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={4}
                  className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 mb-4 h-24"
                  textAlignVertical="top"
                />
                
                <Text className="text-slate-400 text-sm mb-2">Pincode</Text>
                <TextInput 
                  value={pincode}
                  onChangeText={(txt) => { setPincode(txt); setSelectedAddressId(null); }}
                  placeholder="e.g. 411014"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800"
                />
              </View>
            )}

            {fulfillmentMethod === 'SELF_PICKUP' && (
              <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex-row mb-8">
                <CheckCircle2 color="#10b981" size={24} className="mr-3 mt-1" />
                <View className="flex-1">
                  <Text className="text-emerald-400 font-bold mb-1">Save on Delivery!</Text>
                  <Text className="text-emerald-200 text-sm">You can pick up your order directly from {currentShopName}.</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text className="text-white font-bold text-lg mb-4">Select Payment Method</Text>
            
            <View className="space-y-4 mb-8">
              {[
                { id: 'RAZORPAY', title: 'Razorpay', subtitle: 'UPI, Cards, NetBanking', recommended: true },
                { id: 'STRIPE', title: 'Stripe', subtitle: 'International Cards' },
                { id: 'CASHFREE', title: 'Cashfree', subtitle: 'Alternative Indian Gateway' },
                { id: 'COD', title: fulfillmentMethod === 'SELF_PICKUP' ? 'Pay at Store' : 'Cash on Delivery', subtitle: 'Pay when you receive it' }
              ].filter(pm => allowedPayments.includes(pm.id)).map(pm => (
                <TouchableOpacity 
                  key={pm.id}
                  onPress={() => setPaymentMethod(pm.id)}
                  className={`p-4 rounded-2xl border flex-row items-center mb-3 ${paymentMethod === pm.id ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-4 ${paymentMethod === pm.id ? 'border-blue-500' : 'border-slate-600'}`}>
                    {paymentMethod === pm.id && <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-base">{pm.title}</Text>
                      {pm.recommended && (
                        <View className="ml-2 bg-blue-500/20 px-2 py-0.5 rounded-full">
                          <Text className="text-blue-400 text-xs font-bold">Recommended</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-slate-400 text-sm mt-0.5">{pm.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="p-4 bg-slate-900 border-t border-slate-800 pb-8">
        <View className="flex-row justify-between mb-4">
          <Text className="text-slate-400 text-lg">Total to Pay</Text>
          <Text className="text-white font-black text-2xl">₹{finalTotal}</Text>
        </View>
        
        {step === 1 ? (
          <TouchableOpacity 
            className="bg-blue-600 w-full py-4 rounded-2xl shadow-lg shadow-blue-500/30 items-center"
            onPress={() => setStep(2)}
          >
            <Text className="text-white font-bold text-lg">Proceed to Payment</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            className="bg-emerald-600 w-full py-4 rounded-2xl shadow-lg shadow-emerald-500/30 flex-row justify-center items-center"
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Pay ₹{finalTotal}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
