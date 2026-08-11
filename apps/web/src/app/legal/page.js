'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Shield, FileText, RefreshCcw, HelpCircle } from 'lucide-react';

export default function LegalHub() {
  const [activeTab, setActiveTab] = useState('terms');

  const tabs = [
    { id: 'terms', icon: FileText, label: 'Terms of Service' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
    { id: 'refunds', icon: RefreshCcw, label: 'Refund Policy' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6 pt-24">
        
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-blue-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white">Legal & Compliance Hub</h1>
            <p className="text-slate-400 mt-1 font-medium">Mandatory policies for DPDP Act and Payment Gateway compliance.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl min-h-[500px]">
          {activeTab === 'terms' && (
            <div className="prose prose-invert max-w-none animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
              <p className="text-slate-400 text-sm mb-6">Last updated: August 2026</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">1. Acceptance of Terms</h3>
              <p className="text-slate-300">By accessing and using LocalSampark, you agree to be bound by these Terms of Service. This agreement constitutes a legally binding contract between you and LocalSampark Technologies.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">2. E-Commerce & Deliveries</h3>
              <p className="text-slate-300">LocalSampark acts as a technology platform connecting consumers with local merchants. We are not responsible for the quality, safety, or legality of the items sold by merchants on the platform.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">3. Society Management & Gatekeeper</h3>
              <p className="text-slate-300">The Gatekeeper module is provided as an intercom utility. LocalSampark assumes no liability for security breaches within the physical premises of the society.</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="prose prose-invert max-w-none animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">Privacy Policy (DPDP Act Compliant)</h2>
              <p className="text-slate-400 text-sm mb-6">Last updated: August 2026</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">1. Data Collection</h3>
              <p className="text-slate-300">We collect information that you provide directly to us, including Name, Address, Phone Number, and Geolocation (for delivery routing). We operate strictly under the Digital Personal Data Protection Act (DPDPA), India.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">2. Data Processing & Sharing</h3>
              <p className="text-slate-300">Your data is shared exclusively with Delivery Riders and Shop Owners to fulfill your active orders. We do not sell your personal data to third-party ad networks.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">3. Your Rights (Data Export & Deletion)</h3>
              <p className="text-slate-300">You have the absolute right to request a complete export of your personal data, or permanent deletion of your account from our servers. You can execute these actions via the Security section in your Profile.</p>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="prose prose-invert max-w-none animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">Refund & Cancellation Policy</h2>
              <p className="text-slate-400 text-sm mb-6">Mandatory compliance for Razorpay / Payment Gateways</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">1. Order Cancellations</h3>
              <p className="text-slate-300">You may cancel your order within 5 minutes of placing it for a 100% refund. Once the shop accepts and prepares the order, cancellation may incur a penalty up to 100% of the order value.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">2. Missing or Defective Items</h3>
              <p className="text-slate-300">If items are missing or defective, you must raise a ticket via the Support Helpdesk within 24 hours of delivery. Upon verification with the shop and rider, a partial or full refund will be credited to your original payment method within 5-7 business days.</p>
              
              <h3 className="text-lg font-bold text-white mt-6 mb-2">3. SaaS Subscription Refunds</h3>
              <p className="text-slate-300">Shop Owners subscribing to LocalSampark SaaS plans can cancel anytime. Refunds for partial months are not provided. The subscription will remain active until the end of the billing cycle.</p>
            </div>
          )}
        </div>

        {/* Contact Footer */}
        <div className="mt-8 bg-blue-900/20 border border-blue-900/50 rounded-2xl p-6 flex items-start gap-4">
          <HelpCircle className="text-blue-500 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-white mb-1">Grievance Officer</h3>
            <p className="text-slate-400 text-sm">Under the IT Act 2000, please direct legal inquiries to: <br/><strong>legal@localsampark.com</strong> | +91-9876543210</p>
          </div>
        </div>

      </div>
    </div>
  );
}
