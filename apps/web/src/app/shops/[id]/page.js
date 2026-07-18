'use client';
import { API_URL } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCartStore } from '../../../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Navigation, Star, MessageSquare, HelpCircle, 
  Clock, Truck, MapPin, Share2, Phone, BadgeCheck, 
  Minus, Plus, ShoppingBag, CreditCard, Wallet, Calendar, X 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

// Visitor View Router — maps 55 categories to correct visitor experience
import VisitorViewRouter from './components/VisitorViewRouter';
import ShopChat from './components/ShopChat';
import OrderHistory from './components/OrderHistory';
import LoyaltyGamification from './components/LoyaltyGamification';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWalkin = searchParams.get('walkin') === 'true';
  const { id } = params;

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [offers, setOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [qaList, setQaList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('products');
  const [infoTab, setInfoTab] = useState('reviews');
  const [newQuestion, setNewQuestion] = useState('');

  // Global Cart
  const { items: cart, addItem, removeItem, updateQuantity, getCartTotal, openCart } = useCartStore();
  
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Appointment state
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Checkout/Payment state
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [processing, setProcessing] = useState(false);
  const [useCoins, setUseCoins] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    async function fetchShopData() {
      try {
        const [shopRes, offersRes, reviewsRes, qaRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/shops/${id}`),
          fetch(`${API_URL}/api/v1/shops/${id}/offers`).catch(()=>({json:()=>[]})),
          fetch(`${API_URL}/api/v1/shops/${id}/reviews`).catch(()=>({json:()=>[]})),
          fetch(`${API_URL}/api/v1/shops/${id}/qa`).catch(()=>({json:()=>[]}))
        ]);
        
        const shopData = await shopRes.json();
        setShop(shopData);
        
        const offersData = await offersRes.json();
        setOffers(Array.isArray(offersData) ? offersData : []);
        
        const reviewsData = await reviewsRes.json();
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);

        const qaData = await qaRes.json();
        setQaList(Array.isArray(qaData) ? qaData : []);

        const bm = shopData.category_details?.business_model || 'product';

        if (bm === 'product' || bm === 'hybrid') {
          const prodRes = await fetch(`${API_URL}/api/v1/shops/${id}/products`);
          const prodData = await prodRes.json();
          setProducts(Array.isArray(prodData) ? prodData : []);
        }

        if (bm === 'appointment' || bm === 'hybrid') {
          const srvRes = await fetch(`${API_URL}/api/v1/shops/${id}/services`);
          const srvData = await srvRes.json();
          setServices(Array.isArray(srvData) ? srvData : []);

          const staffRes = await fetch(`${API_URL}/api/v1/shops/${id}/staff`);
          const staffData = await staffRes.json();
          setStaff(Array.isArray(staffData) ? staffData : []);
        }

        if (bm === 'appointment') setActiveTab('services');

        setLoading(false);
      } catch (err) {
        console.error('Failed to load shop details', err);
        setLoading(false);
      }
    }
    fetchShopData();

    return () => document.body.removeChild(script);
  }, [id]);

  useEffect(() => {
    if (selectedStaff && appointmentDate) {
        setSlotsLoading(true);
        fetch(`${API_URL}/api/v1/shops/${id}/staff/${selectedStaff.id}/slots?date=${appointmentDate}`)
            .then(r => r.json())
            .then(data => {
                setAvailableSlots(data.slots || []);
                setSlotsLoading(false);
            })
            .catch(() => setSlotsLoading(false));
    }
  }, [selectedStaff, appointmentDate, id]);

  const shopCartItems = cart.filter(item => item.shop_id === id);
  const getDeliveryFee = () => deliveryType === 'delivery' ? 40 : 0;
  const cartSubtotal = shopCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTotal = cartSubtotal + getDeliveryFee();

  const getServiceFinalPrice = () => {
      if (!selectedService) return 0;
      let price = selectedService.price;
      if (timeSlot && timeSlot.surgeMultiplier) {
          price = price * timeSlot.surgeMultiplier;
      }
      return price;
  };

  const totalCheckoutAmount = cartTotal + getServiceFinalPrice();

  const handleWhatsAppContact = (type) => {
    const msg = "Hi, I have an inquiry about your shop on LocalSampark.";
    const phone = shop.phone_number || '';
    if (type === 'web') {
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      alert("WhatsApp Business API integration triggered.");
    }
  };

  const submitQuestion = () => {
    if(!newQuestion) return;
    alert("Question submitted successfully!");
    setNewQuestion('');
  };

  const handleCheckout = async () => {
    setProcessing(true);
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      alert("Please login first.");
      router.push('/login');
      return;
    }

    try {
      if (paymentMethod === 'RAZORPAY') {
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          alert("Razorpay SDK failed to load. Are you online?");
          setProcessing(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/payment/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: totalCheckoutAmount })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || 'rzp_test_YourKeyId', // Use env in prod
          amount: data.amount,
          currency: data.currency,
          name: shop.name,
          description: "LocalSampark Order Checkout",
          order_id: data.id,
          handler: async function (response) {
            const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              alert("Payment Successful & Order Placed!");
              shopCartItems.forEach(item => removeItem(item.id));
              setShowCheckout(false);
              router.push('/order-tracking');
            } else {
              alert("Payment Verification Failed!");
            }
          },
          theme: { color: "#f97316" }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          alert("Payment Failed: " + response.error.description);
        });
        rzp.open();
        setProcessing(false);
      } else {
        // COD or WALLET logic
        setTimeout(() => {
            setProcessing(false);
            alert("Booking / Order Placed Successfully!");
            shopCartItems.forEach(item => removeItem(item.id));
            setShowCheckout(false);
            router.push('/order-tracking');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during checkout.");
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
    </div>
  );
  
  if (!shop) return <div className="p-16 text-center text-text-muted">Shop not found.</div>;

  const bm = shop.category_details?.business_model;
  const catId = shop.category_id;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12 bg-section-alt">
        <div className="container max-w-7xl">
          
          <AnimatePresence>
            {isWalkin && (
                <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg">
                    <BadgeCheck className="w-8 h-8" />
                    <div>
                        <h3 className="font-bold text-lg">Welcome to {shop.name}!</h3>
                        <p className="text-sm opacity-90">QR Scan successful. You are currently in-store.</p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Shop Header Banner */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center mb-8 relative rounded-3xl border border-border shadow-sm bg-background">
            {shop.is_premium === 1 && (
                <div className="absolute top-6 right-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black px-4 py-1.5 rounded-full text-xs font-bold z-10 shadow-lg flex items-center gap-1">
                    <Star className="w-4 h-4 fill-black" /> PREMIUM
                </div>
            )}
            
            <div className="w-32 h-32 lg:w-40 lg:h-40 bg-background-alt rounded-2xl flex items-center justify-center overflow-hidden border border-border shrink-0 shadow-sm">
              {shop.photo_urls && JSON.parse(shop.photo_urls).length > 0 ? (
                  <img src={JSON.parse(shop.photo_urls)[0]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" alt="" />
              ) : (
                  <Store className="w-16 h-16 text-text-muted" />
              )}
            </div>
            
            <div className="flex-1">
              <Badge variant="primary" className="mb-3">{shop.category_details?.name}</Badge>
              <h1 className="text-3xl lg:text-4xl font-heading font-black mb-2 text-text">{shop.name}</h1>
              <p className="text-text-muted mb-6 flex items-center gap-2 font-medium">
                  <MapPin className="w-4 h-4" /> {shop.address}
              </p>
              
              <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleWhatsAppContact('web')} icon={MessageSquare}>WhatsApp Web</Button>
                  <Button variant="outline" size="sm" onClick={() => {navigator.clipboard.writeText(window.location.href); alert("Link copied!");}} icon={Share2}>Share</Button>
                  <Button size="sm" className="bg-pink-500 hover:bg-pink-600 border-pink-500 shadow-lg shadow-pink-500/20" onClick={() => alert('Referral link generated!')}>🎁 Refer & Earn ₹50</Button>
                  {(bm === 'product' || bm === 'hybrid') && (
                    <Button variant="secondary" size="sm" icon={Navigation} onClick={() => alert('Opening AR Store Navigator...')}>
                      AR Navigate Store
                    </Button>
                  )}
              </div>
            </div>
          </motion.div>

          {/* Offers Section */}
          {offers && offers.length > 0 && (
            <div className="mb-10 overflow-hidden">
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {offers.map(offer => (
                    <div key={offer.id} className="min-w-[280px] p-5 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-xl shadow-green-500/20 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 text-white/10 group-hover:scale-150 transition-transform duration-500">
                            <BadgeCheck className="w-24 h-24" />
                        </div>
                        <h3 className="text-2xl font-black mb-1">{offer.discount_percentage}% OFF</h3>
                        <p className="font-medium text-green-50 mb-2">{offer.title}</p>
                        <p className="text-xs text-green-200">Valid until: {new Date(offer.valid_until).toLocaleDateString()}</p>
                    </div>
                ))}
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">

              {/* Category-Specific Visitor Experience */}
              {shop?.category_details?.slug && (
                <VisitorViewRouter
                  categorySlug={shop.category_details.slug}
                  shop={shop}
                  services={services}
                  staff={staff}
                  products={products}
                  onBookAppointment={({ service, staff: selectedStaffMember }) => {
                    setSelectedService(service);
                    if (selectedStaffMember) setSelectedStaff(selectedStaffMember);
                    setActiveTab('services');
                  }}
                  onRequestQuote={({ service }) => {
                    setSelectedService(service);
                    setActiveTab('services');
                  }}
                  onRequestService={({ service }) => {
                    setSelectedService(service);
                    setActiveTab('services');
                  }}
                  onSubscribe={(plan) => {
                    alert('Subscription flow triggered');
                  }}
                />
              )}
              
              {/* Tabs for Hybrid */}
              {bm === 'hybrid' && (
                  <div className="flex gap-4 p-1 bg-border rounded-xl w-fit mb-6">
                      <button className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-background shadow-sm text-text' : 'text-text-muted hover:text-text'}`} onClick={() => setActiveTab('products')}>🛒 Retail Products</button>
                      <button className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'services' ? 'bg-background shadow-sm text-text' : 'text-text-muted hover:text-text'}`} onClick={() => setActiveTab('services')}>📅 Book Services</button>
                  </div>
              )}

              {activeTab === 'services' && (bm === 'appointment' || bm === 'hybrid') && (
                <div className="glass-card p-6 lg:p-8 rounded-3xl border border-border bg-background shadow-sm">
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2"><BadgeCheck className="w-6 h-6 text-primary"/> Select Service</h2>
                  <div className="grid gap-4 mb-8">
                    {services.map(s => (
                        <div key={s.id} onClick={() => setSelectedService(s)} className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex justify-between items-center ${selectedService?.id === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-background'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-lg">{s.name}</h4>
                                    {s.is_free_for_premium === 1 && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Free for Premium</Badge>}
                                </div>
                                <p className="text-text-muted text-sm mb-2">{s.description}</p>
                                <span className="flex items-center gap-1 text-xs font-semibold text-text-muted bg-background-alt px-2 py-1 rounded-md w-fit"><Clock className="w-3 h-3"/> {s.duration_minutes} mins</span>
                            </div>
                            <div className="font-black text-xl text-primary">₹{s.price}</div>
                        </div>
                    ))}
                  </div>
                  
                  <AnimatePresence>
                      {selectedService && (
                          <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden">
                            <h2 className="text-2xl font-heading font-bold mb-6 mt-4 flex items-center gap-2"><Store className="w-6 h-6 text-primary"/> Select Professional</h2>
                            <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar">
                            {staff.map(st => (
                                <div key={st.id} onClick={() => setSelectedStaff(st)} className={`p-4 border-2 rounded-2xl cursor-pointer text-center min-w-[150px] transition-all duration-200 ${selectedStaff?.id === st.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                                    <div className="w-16 h-16 mx-auto rounded-full bg-background-alt overflow-hidden mb-3 border border-border">
                                        {st.profile_image ? <img src={st.profile_image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                                    </div>
                                    <div className="font-bold text-text mb-1">{st.name}</div>
                                    <div className="text-xs text-text-muted font-medium mb-2">{st.specialization || st.role}</div>
                                    <div className="text-xs flex items-center justify-center gap-1 font-bold text-amber-600 bg-amber-50 rounded-full py-0.5"><Star className="w-3 h-3 fill-amber-500"/> {st.avg_rating} ({st.experience_years}y)</div>
                                </div>
                            ))}
                            </div>
                          </motion.div>
                      )}
                  </AnimatePresence>

                  <AnimatePresence>
                      {selectedStaff && (
                        <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden pt-4 border-t border-border">
                            <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary"/> Select Date & Time</h3>
                            <input type="date" value={appointmentDate} onChange={e => { setAppointmentDate(e.target.value); setTimeSlot(null); }} className="w-full max-w-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-6" min={new Date().toISOString().split('T')[0]} />

                            {slotsLoading ? (
                                <div className="flex items-center gap-2 text-primary"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Loading slots...</div>
                            ) : availableSlots.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                    {availableSlots.map(sl => (
                                        <button 
                                            key={sl.time} 
                                            onClick={() => setTimeSlot(sl)}
                                            className={`relative px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${timeSlot?.time === sl.time ? 'bg-primary border-primary text-white shadow-md' : 'bg-background border-border text-text hover:border-primary/50'}`}
                                        >
                                            {sl.time}
                                            {sl.surgeMultiplier > 1.0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-[10px] shadow-sm animate-pulse">🔥</span>}
                                        </button>
                                    ))}
                                </div>
                            ) : appointmentDate ? <p className="text-red-500 font-medium bg-red-50 p-3 rounded-lg w-fit">No slots available on this date.</p> : null}
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === 'products' && (bm === 'product' || bm === 'hybrid') && (
                <div className="glass-card p-6 lg:p-8 rounded-3xl border border-border bg-background shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-heading font-bold flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-primary"/> Products / Menu</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map(product => {
                        const inCart = shopCartItems.find(c => c.id === product.id);
                        return (
                        <div key={product.id} className="flex flex-col p-4 border border-border rounded-2xl bg-background hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">{product.name}</h4>
                                    <p className="text-text-muted text-sm line-clamp-2 mt-1">{product.description}</p>
                                </div>
                                <span className="font-black text-xl text-primary shrink-0 ml-4">₹{product.price}</span>
                            </div>
                          
                            <div className="mt-auto pt-4">
                                {inCart ? (
                                    <div className="flex items-center justify-between bg-primary text-white p-1 rounded-xl shadow-md">
                                        <button onClick={() => updateQuantity(product.id, inCart.quantity - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-bold text-lg w-8 text-center">{inCart.quantity}</span>
                                        <button onClick={() => addItem({...product, shop_id: id}, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button className="w-full" variant="outline" onClick={() => addItem({...product, shop_id: id}, 1)}>Add to Cart</Button>
                                )}
                            </div>
                        </div>
                      )
                    })}
                    {products.length === 0 && <div className="col-span-full py-12 text-center text-text-muted bg-background-alt rounded-2xl border border-dashed border-border">No products uploaded yet.</div>}
                  </div>
                </div>
              )}

              {/* Trust Section: Reviews & QA */}
              <div className="glass-card p-6 lg:p-8 rounded-3xl border border-border bg-background shadow-sm">
                <div className="flex gap-8 border-b border-border mb-6">
                  <button onClick={() => setInfoTab('reviews')} className={`pb-4 text-lg font-bold transition-colors relative ${infoTab === 'reviews' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
                    Reviews
                    {infoTab === 'reviews' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                  </button>
                  <button onClick={() => setInfoTab('qa')} className={`pb-4 text-lg font-bold transition-colors relative ${infoTab === 'qa' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
                    Ask the Neighborhood
                    {infoTab === 'qa' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                  </button>
                  <button onClick={() => setInfoTab('orders')} className={`pb-4 text-lg font-bold transition-colors relative ${infoTab === 'orders' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
                    My Orders
                    {infoTab === 'orders' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                  </button>
                  <button onClick={() => setInfoTab('loyalty')} className={`pb-4 text-lg font-bold transition-colors relative ${infoTab === 'loyalty' ? 'text-primary' : 'text-text-muted hover:text-text'}`}>
                    🎁 Rewards
                    {infoTab === 'loyalty' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                  </button>
                </div>

                {infoTab === 'reviews' ? (
                  <div className="space-y-6">
                    {reviews.length === 0 ? <p className="text-text-muted italic">No reviews yet.</p> : (
                        reviews.map(r => (
                            <div key={r.id} className="pb-6 border-b border-border last:border-0 last:pb-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                      {(r.user_name || 'C')[0].toUpperCase()}
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="font-bold">{r.user_name || 'Customer'}</span>
                                          {r.is_society_verified === 1 && (
                                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 py-0 text-[10px] h-5"><BadgeCheck className="w-3 h-3 mr-1"/> Verified</Badge>
                                          )}
                                      </div>
                                      <div className="flex text-amber-500 text-sm mt-0.5">
                                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.round(r.rating || 5) ? 'fill-amber-500' : 'text-border fill-transparent'}`} />)}
                                      </div>
                                  </div>
                                </div>
                                <p className="text-text-muted ml-13 pl-13">{r.review_text || r.comment}</p>
                            </div>
                        ))
                    )}
                    <Button variant="outline" className="mt-4 w-full" icon={Star}>Write a Review</Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 mb-8">
                      <input 
                        type="text" 
                        placeholder="E.g., Do they sell sugar-free cakes?" 
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button onClick={submitQuestion} icon={MessageSquare}>Ask</Button>
                    </div>

                    <div className="space-y-4">
                        {qaList.length === 0 ? <p className="text-text-muted italic text-center py-8">No questions yet. Be the first to ask!</p> : (
                            qaList.map(qa => (
                                <div key={qa.id} className="bg-background-alt p-5 rounded-2xl border border-border">
                                    <div className="font-bold text-lg mb-3 flex items-start gap-2">
                                      <span className="text-primary mt-1"><HelpCircle className="w-5 h-5"/></span>
                                      {qa.question}
                                    </div>
                                    {qa.answer ? (
                                      <div className="flex gap-3 pl-7">
                                        <div className="w-1 h-full bg-green-500/20 rounded-full"></div>
                                        <div>
                                          <p className="text-text-muted mb-1">{qa.answer}</p>
                                          <p className="text-xs font-bold text-green-600 flex items-center gap-1"><BadgeCheck className="w-3 h-3"/> Answered by Verified Neighbor</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-text-muted italic pl-7">Pending answer...</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                  </div>
                )}

                {infoTab === 'orders' && (
                  <OrderHistory shopId={id} onReorder={(order) => { 
                    if (order.items && Array.isArray(order.items)) {
                      order.items.forEach(item => addItem({ ...item, shop_id: id }, item.quantity || 1));
                      alert('Items added to cart!');
                    } else {
                      alert('Order items not found.');
                    }
                  }} />
                )}

                {infoTab === 'loyalty' && (
                  <LoyaltyGamification shopId={id} shopName={shop?.name} />
                )}
              </div>
            </div>

            {/* Sidebar (Cart / Summary) */}
            <div className="lg:col-span-1">
                <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-lg sticky top-[100px]">
                    <h3 className="text-xl font-heading font-black mb-6 border-b border-border pb-4 flex items-center justify-between">
                        Order Summary
                        {(shopCartItems.length > 0 || selectedService) && <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{shopCartItems.reduce((acc, item)=>acc+item.quantity, 0) + (selectedService?1:0)}</span>}
                    </h3>
                    
                    {shopCartItems.length === 0 && !selectedService ? (
                    <div className="text-center py-8">
                        <ShoppingBag className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
                        <p className="text-text-muted font-medium">Your cart is empty</p>
                    </div>
                    ) : (
                    <div>
                        {selectedService && (
                            <div className="mb-6 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                                <div className="font-bold text-primary flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> Appointment</div>
                                <div className="flex justify-between items-start font-bold mb-1">
                                    <span>{selectedService.name} {timeSlot?.surgeMultiplier > 1 && <span className="text-red-500 ml-1">(Surge)</span>}</span>
                                    <span>₹{getServiceFinalPrice().toFixed(2)}</span>
                                </div>
                                {timeSlot && <div className="text-sm text-text-muted font-medium">{appointmentDate} at {timeSlot.time}</div>}
                            </div>
                        )}
                        
                        {shopCartItems.length > 0 && (
                            <div className="mb-6">
                                <div className="font-bold text-text flex items-center gap-2 mb-3 pb-2 border-b border-border"><ShoppingBag className="w-4 h-4"/> Retail Items</div>
                                <div className="space-y-3">
                                    {shopCartItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-start">
                                            <div className="flex gap-2 text-sm font-medium">
                                                <span className="text-text-muted">{item.quantity}x</span>
                                                <span>{item.name}</span>
                                            </div>
                                            <span className="font-bold">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100">
                                    <Clock className="w-4 h-4"/> Estimated Ready: ~25 mins
                                </div>
                            </div>
                        )}
                        
                        <div className="border-t border-dashed border-border py-4 mb-6">
                            <div className="flex justify-between items-center text-sm mb-2 text-text-muted">
                                <span>Subtotal</span>
                                <span>₹{(cartSubtotal + getServiceFinalPrice()).toFixed(2)}</span>
                            </div>
                            {shopCartItems.length > 0 && deliveryType === 'delivery' && (
                                <div className="flex justify-between items-center text-sm mb-2 text-text-muted">
                                    <span>Delivery Fee</span>
                                    <span>₹40.00</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xl font-black mt-4">
                                <span>Total Payable</span>
                                <span className="text-primary">₹{totalCheckoutAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <Button className="w-full shadow-lg shadow-primary/20 hover:-translate-y-1" size="lg" onClick={() => setShowCheckout(true)}>
                        Proceed to Checkout
                        </Button>
                    </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-card-bg w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-background">
                    <h2 className="text-2xl font-heading font-black">Checkout</h2>
                    <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-background-alt rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {shopCartItems.length > 0 && shop.delivery_available === 1 && (
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Delivery Method</label>
                            <div className="flex gap-3 mb-3">
                                {shop.pickup_available === 1 && (
                                    <button onClick={() => setDeliveryType('pickup')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${deliveryType === 'pickup' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                        Pickup
                                    </button>
                                )}
                                <button onClick={() => setDeliveryType('delivery')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${deliveryType === 'delivery' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                    Delivery (+₹40)
                                </button>
                            </div>
                            <AnimatePresence>
                                {deliveryType === 'delivery' && (
                                    <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden">
                                        <textarea className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] text-sm" placeholder="Enter Full Delivery Address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-sm"><Wallet className="w-5 h-5"/></div>
                            <div>
                                <div className="font-bold text-amber-700">Sampark Coins</div>
                                <div className="text-xs text-amber-600 font-medium">Use loyalty balance</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={useCoins} onChange={(e) => setUseCoins(e.target.checked)} />
                            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Payment Method</label>
                        <div className="space-y-3">
                            <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                                <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                                <span className="font-bold text-sm">Pay at Shop / Cash on Delivery</span>
                            </label>
                            <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'WALLET' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                                <input type="radio" checked={paymentMethod === 'WALLET'} onChange={() => setPaymentMethod('WALLET')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                                <span className="font-bold text-sm">LocalSampark Wallet</span>
                            </label>
                            <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                                <input type="radio" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                                <span className="font-bold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-text-muted"/> Online via Razorpay</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 bg-background border-t border-border">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-text-muted font-bold">Total Payable</span>
                        <span className="text-2xl font-black text-primary">₹{totalCheckoutAmount.toFixed(2)}</span>
                    </div>
                    <Button className="w-full shadow-lg shadow-primary/20" size="lg" onClick={handleCheckout} disabled={processing}>
                        {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirm & Pay'}
                    </Button>
                </div>
            </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Widget */}
      {shop && <ShopChat shopId={id} shopName={shop.name} shopLogo={shop.logo} mode="floating" />}

    </div>
  );
}
