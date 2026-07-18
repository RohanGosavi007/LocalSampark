'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { Store, MapPin, CheckCircle, Search, Filter } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function FranchiseShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [franchiseData, setFranchiseData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        // 1. Get Franchise Info (for pincode)
        const fRes = await fetch(`${API_URL}/api/v1/franchise/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const fJson = await fRes.json();
        setFranchiseData(fJson.franchise);

        // 2. Get Shops (Mock filter for this territory)
        const sRes = await fetch(`${API_URL}/api/v1/shops?limit=20`);
        const sData = await sRes.json();
        const allShops = Array.isArray(sData) ? sData : (sData.data || []);
        
        // Filter shops visually to match the territory pincode if possible, or just show them
        // For demonstration, we just show the first 10
        setShops(allShops.slice(0, 10));

      } catch (e) {
        console.error('Failed to fetch shops', e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">My Territory Shops</h1>
              <p className="text-slate-400">Manage and onboard local businesses in {franchiseData?.territory_name || 'your area'}.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search Shops" className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 w-64" />
              </div>
              <button className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition">
                <Filter className="w-5 h-5" />
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">
                + Onboard New Shop
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-slate-400 col-span-full">Loading shops...</p>
            ) : shops.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl">
                <Store className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl text-white font-bold mb-2">No Shops Onboarded</h3>
                <p className="text-slate-400">You haven't onboarded any shops in this territory yet.</p>
              </div>
            ) : (
              shops.map(shop => (
                <div key={shop.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500">
                      <Store className="w-6 h-6" />
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition">{shop.shop_name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{shop.category}</p>
                  
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Total Sales</p>
                      <p className="text-white font-bold">₹{Math.floor(Math.random() * 50000).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Commission Generated</p>
                      <p className="text-emerald-400 font-bold">+₹{Math.floor(Math.random() * 2000).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
