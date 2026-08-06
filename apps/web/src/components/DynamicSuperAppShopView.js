'use client';
import React, { useState, useEffect } from 'react';
import { 
  Store, ShoppingCart, Calendar as CalendarIcon, Clock, CheckCircle2, 
  MapPin, Star, Plus, Minus, CreditCard, ChevronRight, Package, User, ArrowRight, X
} from 'lucide-react';

export default function DynamicSuperAppShopView({ shopId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab for HYBRID shops (products vs booking)
  const [activeTab, setActiveTab] = useState('products');

  // Product Cart State
  const [cart, setCart] = useState([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment Booking State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  async function fetchShopData() {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/v1/shops/${shopId}`);
      if (!res.ok) throw new Error('Failed to load shop details');
      const json = await res.json();
      setData(json);

      // Set default tab based on categoryType
      if (json.shop.categoryType === 'APPOINTMENT') {
        setActiveTab('appointment');
      } else {
        setActiveTab('products');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Cart Helpers
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartTotalPaise = cart.reduce((acc, item) => acc + item.pricePaise * item.quantity, 0);

  // Handle Product Checkout
  const handleCheckoutSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        shopId: data.shop.id,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod,
      };

      const res = await fetch('http://localhost:5000/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setCheckoutStatus(result.order);
        setCart([]);
      } else {
        alert(result.error || 'Checkout failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Service Appointment Booking
  const handleBookingSubmit = async () => {
    if (!selectedSlot) {
      alert('Please select an available time slot');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        shopId: data.shop.id,
        serviceSlotId: selectedSlot.id,
        paymentMethod: 'COD',
      };

      const res = await fetch('http://localhost:5000/api/v1/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setBookingStatus(result.appointment);
        fetchShopData(); // Refresh slots
      } else {
        alert(result.error || 'Booking failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400">Loading Super-App Experience...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <p className="text-red-400 mb-4">{error || 'Shop details unavailable'}</p>
        <button onClick={fetchShopData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  const { shop, products, serviceSlots, availableServices } = data;
  const isProductShop = shop.categoryType === 'PRODUCT';
  const isAppointmentShop = shop.categoryType === 'APPOINTMENT';
  const isHybridShop = shop.categoryType === 'HYBRID';

  // Filter slots for selected date & service if chosen
  const datesAvailable = Array.from(new Set(serviceSlots.map((s) => s.date)));
  const filteredSlots = serviceSlots.filter((s) => {
    const dateMatch = !selectedDate || s.date === selectedDate;
    const serviceMatch = !selectedService || s.serviceName === selectedService.name;
    return dateMatch && serviceMatch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* Header Banner */}
      <div className="relative bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-2xl">
              {shop.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  shop.categoryType === 'PRODUCT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  shop.categoryType === 'APPOINTMENT' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {shop.categoryType} SHOP
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <span>{shop.category.name}</span> • 
                <span className="flex items-center text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                  {shop.rating} ({shop.totalRatings})
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {shop.address.line1}, {shop.address.locality}, {shop.address.city}
              </p>
            </div>
          </div>

          {/* Quick Info Badge */}
          <div className="flex items-center space-x-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Est. Delivery</span>
              <span className="text-sm font-semibold text-emerald-400">{shop.estimatedDeliveryTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* HYBRID Tab Switcher */}
        {isHybridShop && (
          <div className="flex space-x-2 border-b border-slate-800 mb-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'products'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Physical Products ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('appointment')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'appointment'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Book Appointment ({availableServices.length} Services)</span>
            </button>
          </div>
        )}

        {/* ─── PRODUCT FLOW (PRODUCT & HYBRID) ─── */}
        {(isProductShop || (isHybridShop && activeTab === 'products')) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Products Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Store Catalog ({products.length} Items)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const cartItem = cart.find((i) => i.id === product.id);
                  return (
                    <div key={product.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-white text-sm">{product.name}</h3>
                          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            {product.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{product.description}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                        <div>
                          <span className="text-sm font-bold text-white">{product.priceFormatted}</span>
                          {product.discountPercent > 0 && (
                            <span className="text-xs text-slate-500 line-through ml-2">{product.mrpFormatted}</span>
                          )}
                        </div>

                        {cartItem ? (
                          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-1">
                            <button onClick={() => updateCartQty(product.id, -1)} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-emerald-400 px-1">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQty(product.id, 1)} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit sticky top-6">
              <h3 className="font-semibold text-white text-base mb-4 flex items-center justify-between">
                <span>Your Order</span>
                <span className="text-xs font-normal text-slate-400">{cart.length} items</span>
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 truncate max-w-[140px]">{item.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">x{item.quantity}</span>
                          <span className="font-medium text-white">₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span>₹{(cartTotalPaise / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Delivery Fee</span>
                      <span>₹30.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Platform Fee</span>
                      <span>₹5.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                      <span>Total</span>
                      <span className="text-emerald-400">₹{((cartTotalPaise + 3500) / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCheckoutModalOpen(true)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── APPOINTMENT FLOW (APPOINTMENT & HYBRID) ─── */}
        {(isAppointmentShop || (isHybridShop && activeTab === 'appointment')) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Step 1: Select Service & Date */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">1. Select Service</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableServices.map((service, idx) => {
                    const isSelected = selectedService?.name === service.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedService(service)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm">{service.name}</h3>
                          <span className="text-xs font-bold text-emerald-400">{service.priceFormatted}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-3">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {service.durationMinutes} mins</span>
                          <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {service.providerName}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">2. Choose Date</h2>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedDate('')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${
                      !selectedDate ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    All Available Dates
                  </button>
                  {datesAvailable.map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${
                        selectedDate === date ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot Picker */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">3. Select Time Slot</h2>
                {filteredSlots.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    No available time slots match your current selection filter.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {filteredSlots.map((slot) => {
                      const isAvailable = slot.status === 'AVAILABLE';
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2.5 rounded-lg text-xs font-medium border transition-all text-center ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                              : isAvailable
                              ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                              : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed line-through'
                          }`}
                        >
                          <div>{slot.startTime}</div>
                          <div className="text-[10px] opacity-75">{slot.date.slice(5)}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Booking Summary Sidebar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit sticky top-6">
              <h3 className="font-semibold text-white text-base mb-4">Booking Summary</h3>

              {bookingStatus ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">Appointment Requested!</h4>
                  <p className="text-xs text-slate-300">Booking Ref: <span className="font-mono text-emerald-400">{bookingStatus.bookingNumber}</span></p>
                  <p className="text-xs text-slate-400">Date: {bookingStatus.scheduledDate} @ {bookingStatus.scheduledTime}</p>
                  <button
                    onClick={() => { setBookingStatus(null); setSelectedSlot(null); }}
                    className="mt-3 text-xs text-emerald-400 hover:underline"
                  >
                    Book Another Appointment
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg space-y-2">
                    <div>
                      <span className="text-slate-500 block">Service</span>
                      <span className="text-slate-200 font-medium">{selectedService ? selectedService.name : 'Not selected'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Time Slot</span>
                      <span className="text-slate-200 font-medium">
                        {selectedSlot ? `${selectedSlot.date} @ ${selectedSlot.startTime}` : 'Not selected'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Provider</span>
                      <span className="text-slate-200 font-medium">{selectedSlot ? selectedSlot.providerName : 'Assigned on booking'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                    <span>Total Service Fee</span>
                    <span className="text-emerald-400">
                      {selectedSlot ? selectedSlot.priceFormatted : selectedService ? selectedService.priceFormatted : '₹0.00'}
                    </span>
                  </div>

                  <button
                    disabled={!selectedSlot || isSubmitting}
                    onClick={handleBookingSubmit}
                    className={`w-full py-3 font-semibold text-sm rounded-xl transition-colors ${
                      selectedSlot && !isSubmitting
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative">
            <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            {checkoutStatus ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Order Placed Successfully!</h3>
                <p className="text-xs text-slate-400">Order ID: <span className="font-mono text-emerald-400">{checkoutStatus.orderNumber}</span></p>
                <p className="text-xs text-slate-400">Total: {checkoutStatus.totalAmountFormatted} ({checkoutStatus.paymentMethod})</p>
                <button
                  onClick={() => { setIsCheckoutModalOpen(false); setCheckoutStatus(null); }}
                  className="mt-4 px-6 py-2 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Select Payment Method</h3>
                <div className="space-y-2">
                  {['COD', 'UPI', 'CARD'].map((method) => (
                    <label
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                        paymentMethod === method ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-semibold">{method === 'COD' ? 'Cash on Delivery' : method}</span>
                      <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => {}} className="accent-emerald-500" />
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                  <span>Payable Amount</span>
                  <span className="text-emerald-400">₹{((cartTotalPaise + 3500) / 100).toFixed(2)}</span>
                </div>

                <button
                  disabled={isSubmitting}
                  onClick={handleCheckoutSubmit}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm rounded-xl transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Place Order Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
