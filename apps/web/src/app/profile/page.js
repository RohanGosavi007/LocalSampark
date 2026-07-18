'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, MapPin, Package, Star, Heart, Settings, Shield, Award, Clock } from 'lucide-react';

export default function VisitorDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetching from API
    setTimeout(() => {
      setUser({
        name: 'Siddharth R.',
        phone: '+91 98765 43210',
        email: 'siddharth@example.com',
        avatar: 'https://ui-avatars.com/api/?name=Siddharth+R&background=4f46e5&color=fff',
        loyaltyPoints: 1250,
        loyaltyTier: 'Community Champion',
        savedAddresses: [
          { id: 1, type: 'Home', address: 'A-402, Galaxy Apartments, Dhanori, Pune' },
          { id: 2, type: 'Work', address: 'Tech Park, Viman Nagar, Pune' }
        ],
        recentOrders: [
          { id: 'ORD-9912', shop: 'Sharma Grocery', date: 'July 5, 2026', total: '₹540', status: 'Delivered' },
          { id: 'ORD-9884', shop: 'QuickFix Garage', date: 'July 2, 2026', total: '₹1200', status: 'Delivered' }
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

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
          
          <Button variant="outline" icon={Settings} className="hidden sm:flex z-10 bg-white">Edit Profile</Button>
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
                      <Button variant="outline" size="sm" className="bg-white">Reorder</Button>
                    </div>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary font-bold">View All History →</Button>
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
                <button className="text-primary font-bold text-sm hover:underline">+ Add</button>
              </div>
              <div className="space-y-3">
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
                <button className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Heart className="w-5 h-5 text-gray-400"/> Saved Shops & Services</span>
                  <span className="text-gray-300">→</span>
                </button>
                <button className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Shield className="w-5 h-5 text-gray-400"/> Privacy & Security</span>
                  <span className="text-gray-300">→</span>
                </button>
                <button className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-700 flex items-center gap-3"><Settings className="w-5 h-5 text-gray-400"/> Notification Preferences</span>
                  <span className="text-gray-300">→</span>
                </button>
              </Card>
            </section>
          </div>
          
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
