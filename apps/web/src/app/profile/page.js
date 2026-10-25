'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MapPin, Package, Star, Heart, Settings, Shield, Award, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../lib/api';

/**
 * The signed-in user's profile.
 *
 * Every request here used a relative URL (/api/v1/…), which goes to the
 * website rather than the API, so all four failed — and each failure was
 * covered by invented data: a profile for "Siddharth R.", two Pune
 * addresses, two orders that never happened and 1,250 points. Every visitor
 * saw that as their own account.
 *
 * Now: the account (/users/me), the coin balance (/loyalty/balance), saved
 * addresses (/addresses) and order history (/orders/my-orders), with empty
 * states where there is nothing yet. Signed out, it sends you to sign in.
 */
export default function VisitorDashboard() {
  const router = useRouter();
  const { user: session, loading: sessionLoading } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.replace('/login?next=/profile');
      return;
    }
    async function loadUserData() {
      const [profileRes, coinsRes, addressRes, ordersRes] = await Promise.allSettled([
        apiGet('/users/me'),
        apiGet('/loyalty/balance'),
        apiGet('/addresses'),
        apiGet('/orders/my-orders'),
      ]);
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);
      const profile = value(profileRes);
      if (!profile) {
        setLoadError('Your profile could not be loaded. Please try again.');
        setLoading(false);
        return;
      }

      const coins = Number(value(coinsRes)?.data?.totalCoins) || 0;
      const addresses = (value(addressRes)?.data || []).map((a) => ({
        id: a.id,
        type: a.address_type ? a.address_type[0].toUpperCase() + a.address_type.slice(1) : 'Address',
        address: [a.apartment_suite, a.street_address, a.city, a.postal_code].filter(Boolean).join(', '),
      }));
      const orders = (value(ordersRes)?.data || []).slice(0, 5).map((o) => ({
        id: o.id,
        shop: o.shop_name || 'LocalSampark',
        date: o.created_at ? new Date(String(o.created_at).replace(' ', 'T')).toLocaleDateString('en-IN') : '',
        total: `₹${Number(o.total_amount || 0).toFixed(2)}`,
        status: String(o.status || 'pending').replace(/_/g, ' '),
      }));

      const name = profile.fullName || profile.name || 'Your account';
      setUser({
        name,
        phone: profile.phone || profile.phone_number || '',
        email: profile.email || '',
        avatar: profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff`,
        loyaltyPoints: coins,
        loyaltyTier: coins > 2000 ? 'Community Legend' : (coins > 1000 ? 'Community Champion' : 'Local Explorer'),
        savedAddresses: addresses,
        recentOrders: orders,
      });
      setLoading(false);
    }
    loadUserData();
  }, [session, sessionLoading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex justify-center items-center text-gray-600 p-8" role="alert">{loadError || 'Loading…'}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md relative z-10">
            <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 text-center sm:text-left z-10">
            <h1 className="text-3xl font-black text-gray-900 mb-2">{user.name}</h1>
            <p className="text-gray-500 font-medium mb-4">{user.phone} • {user.email}</p>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 font-bold">
                <Award className="w-5 h-5" />
                {user.loyaltyTier}
              </div>
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 font-bold">
                <Star className="w-5 h-5 fill-orange-500" />
                {user.loyaltyPoints} Points
              </div>
            </div>
          </div>
          
          <a href="/profile/security" className="hidden sm:flex z-10"><Button variant="outline" icon={Settings} className="bg-white">Account Settings</Button></a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Orders */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Recent Orders & Bookings
              </h2>
              <div className="space-y-4">
                                {user.recentOrders.length === 0 && (
                  <Card className="p-6 text-gray-500 text-center">No orders yet. <a href="/shops" className="text-primary font-bold">Browse shops →</a></Card>
                )}
                {user.recentOrders.map(order => (
                  <Card key={order.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Clock className="w-6 h-6 text-gray-400 group-hover:text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{order.shop}</h3>
                        <p className="text-gray-500 text-sm">{order.id} • {order.date}</p>
                        <p className="font-black text-primary mt-1">{order.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{order.status}</span>
                      <a href={`/order-tracking?id=${order.id}`}><Button variant="outline" size="sm" className="bg-white">Track</Button></a>
                    </div>
                  </Card>
                ))}
              </div>
              <a href="/resident/orders"><Button variant="ghost" className="w-full mt-4 text-primary font-bold">View All History →</Button></a>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Saved Addresses */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Saved Addresses
                </h2>
                
              </div>
              <div className="space-y-3">
                                {user.savedAddresses.length === 0 && (
                  <p className="text-gray-500 text-sm">No saved addresses yet. Addresses you deliver to are saved here.</p>
                )}
                {user.savedAddresses.map(addr => (
                  <div key={addr.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{addr.type}</div>
                      <div className="text-gray-500 text-sm mt-1">{addr.address}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Quick Actions */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Account Settings
              </h2>
              <Card className="divide-y divide-gray-100 overflow-hidden">
                                <a href="/rewards" className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Heart className="w-5 h-5 text-gray-400"/> Coins &amp; Rewards</span>
                  <span className="text-gray-300">→</span>
                </a>
                <a href="/profile/security" className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Shield className="w-5 h-5 text-gray-400"/> Privacy &amp; Security</span>
                  <span className="text-gray-300">→</span>
                </a>
                <a href="/wallet" className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Settings className="w-5 h-5 text-gray-400"/> Wallet</span>
                  <span className="text-gray-300">→</span>
                </a>
              </Card>
            </section>
          </div>
          
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
