'use client';
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Search, Filter, AlertCircle } from 'lucide-react';

export default function FranchiseZones() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">Territory Zones</h1>
              <p className="text-slate-400">Manage zones for your assigned hyper-local territory.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 w-64" />
              </div>
              <button className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl text-white font-bold mb-2">No Data Available</h3>
            <p className="text-slate-400">No records found for zones in your territory yet.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
