'use client';
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Search, Filter, AlertCircle } from 'lucide-react';

export default function FranchiseSettings() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-black text-text mb-2">Territory Settings</h1>
              <p className="text-text-muted">Manage settings for your assigned hyper-local territory.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-5 h-5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-card-bg border border-border rounded-xl text-text outline-none focus:border-blue-500 w-64" />
              </div>
              <button className="p-2 bg-card-bg border border-border rounded-xl text-text-muted hover:bg-background-alt transition">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center py-16 bg-card-bg border border-border rounded-3xl">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl text-text font-bold mb-2">No Data Available</h3>
            <p className="text-text-muted">No records found for settings in your territory yet.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
