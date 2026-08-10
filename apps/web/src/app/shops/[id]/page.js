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
import dynamic from 'next/dynamic';
import VisitorViewRouter from './components/VisitorViewRouter';

const ShopChat = dynamic(() => import('./components/ShopChat'), { ssr: false });
const OrderHistory = dynamic(() => import('./components/OrderHistory'), { ssr: false });
const LoyaltyGamification = dynamic(() => import('./components/LoyaltyGamification'), { ssr: false });
const CheckoutModal = dynamic(() => import('./components/CheckoutModal'), { ssr: false });

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

  // Service Booking State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Global Cart
  const { items: cart, addItem, removeItem, updateQuantity, getCartTotal, openCart } = useCartStore();
  
  const [showCheckout, setShowCheckout] = useState(false);

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
  const cartSubtotal = shopCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getServiceFinalPrice = () => {
      if (!selectedService) return 0;
      let price = selectedService.price;
      if (timeSlot && timeSlot.surgeMultiplier) {
          price = price * timeSlot.surgeMultiplier;
      }
      return price;
  };

  const totalCheckoutAmount = cartSubtotal + getServiceFinalPrice();

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
                  <MapPin className="w-4 h-4 shrink-0" /> 
                  <span className="line-clamp-1">
                      {typeof shop.address === 'object' 
                          ? [shop.address.line1, shop.address.line2, shop.address.city].filter(Boolean).join(', ') 
                          : shop.address}
                  </span>
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
                  onBookAppointment={async ({ service, staff, slot, metadata }) => {
                    try {
                      // Optional slot ID or default
                      const slotId = slot?.id || 'slot_default';
                      
                      const res = await fetch(`${API_URL}/api/v1/book`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          shopId: shop.id,
                          serviceSlotId: slotId,
                          paymentMethod: 'COD',
                          metadata: metadata || {}
                        }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        alert(`Booking Confirmed!\nReference: ${json.appointment?.bookingNumber || 'N/A'}`);
                      } else {
                        alert(`Booking Failed: ${json.error || 'Unknown error'}`);
                      }
                    } catch (err) {
                      alert(`Error: ${err.message}`);
                    }
                  }}
                  onRequestQuote={async ({ service, metadata }) => {
                    alert(`Quote Requested for ${service?.name || 'Service'}! Shop will contact you soon.`);
                  }}
                  onRequestService={async ({ service, metadata }) => {
                    alert(`Service Requested for ${service?.name || 'Service'}! Technician assigned.`);
                  }}
                  onSubscribe={(plan) => {
                    alert(`Subscription ${plan?.name || 'Plan'} activated!`);
                  }}
                />
              )}
              
              {/* Generic fallback blocks removed to ensure specific VisitorViews handle rendering */}

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
      <CheckoutModal 
          showCheckout={showCheckout} 
          setShowCheckout={setShowCheckout} 
          shopCartItems={shopCartItems} 
          shop={shop} 
          baseCheckoutAmount={cartSubtotal + getServiceFinalPrice()} 
      />

      {/* Floating Chat Widget */}
      {shop && <ShopChat shopId={id} shopName={shop.name} shopLogo={shop.logo} mode="floating" />}

    </div>
  );
}
