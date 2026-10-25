'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Shield, FileText, RefreshCcw, HelpCircle, Scale, Trash2 } from 'lucide-react';

const PATHS = {
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
  grievance: '/legal/grievance',
  deletion: '/account-deletion'
};

/**
 * Tabbed legal compliance hub covering DPDP Act 2023, Consumer Protection 2020,
 * Payment Gateway regulations, and Google Play policies.
 */
export default function LegalHub({ initialTab = 'terms' }) {
  const [activeTab, setActiveTab] = useState(PATHS[initialTab] ? initialTab : 'terms');

  const selectTab = (id) => {
    setActiveTab(id);
    if (typeof window !== 'undefined' && PATHS[id] && window.location.pathname !== PATHS[id]) {
      window.history.replaceState(null, '', PATHS[id]);
    }
  };

  const tabs = [
    { id: 'terms', icon: FileText, label: 'Terms of Service' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy (DPDP)' },
    { id: 'refunds', icon: RefreshCcw, label: 'Returns & Refunds' },
    { id: 'grievance', icon: Scale, label: 'Grievance Redressal' },
    { id: 'deletion', icon: Trash2, label: 'Account Deletion' }
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-text flex flex-col">
      <Header />

      <main id="main-content" tabIndex="-1" className="flex-1 max-w-4xl w-full mx-auto p-6 pt-24 focus:outline-none">
        
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-primary" size={32} />
          <div>
            <h1 className="text-3xl font-black text-text font-heading">Legal & Compliance Hub</h1>
            <p className="text-text-muted mt-1 font-medium text-sm">
              Mandatory disclosures under DPDP Act 2023, Consumer Protection (E-Commerce) Rules 2020, and Google Play Store policies.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-card-bg border border-border text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-card-bg border border-border rounded-3xl p-8 shadow-xl min-h-[500px]">
          
          {activeTab === 'terms' && (
            <div className="prose prose-invert max-w-none animate-fade-in text-sm text-text-muted leading-relaxed space-y-4">
              <h2 className="text-2xl font-bold mb-4 text-text font-heading">Terms of Service</h2>
              <p className="text-xs text-text-muted mb-6">Last updated: October 2026</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">1. Platform Nature & Intermediary Role</h3>
              <p>LocalSampark Technologies operates strictly as an electronic commerce marketplace platform connecting consumers with independent local neighbourhood shops, service providers, and delivery agents. Local merchants operate as independent sellers responsible for catalog pricing, Legal Metrology declarations, and FSSAI food quality certifications.</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">2. Orders, Invoicing & Pricing</h3>
              <p>All prices are listed in Indian Rupees (INR) and are inclusive of applicable goods and services tax (GST). Tax invoices are generated electronically under Section 31 of the CGST Act 2017 upon dispatch and made available in-app and on the web portal.</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">3. Consumer Protection Compliance</h3>
              <p>In adherence to Rule 4 of the Consumer Protection (E-Commerce) Rules, 2020, LocalSampark displays accurate seller contact details, customer feedback, and offers an automated grievance tracking mechanism with statutory acknowledgement.</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="prose prose-invert max-w-none animate-fade-in text-sm text-text-muted leading-relaxed space-y-4">
              <h2 className="text-2xl font-bold mb-4 text-text font-heading">Privacy Policy (DPDP Act 2023 Compliant)</h2>
              <p className="text-xs text-text-muted mb-6">Last updated: October 2026</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">1. Data Collected & Grounds for Processing</h3>
              <p>We collect personal information solely for fulfilling orders, optimizing delivery routes, and securing user accounts: Name, Delivery Address, Phone Number, and Geolocation fix (when enabled). All data is processed on lawful grounds under Section 4 of the Digital Personal Data Protection Act, 2023.</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">2. Zero Third-Party Monetization</h3>
              <p>LocalSampark does not sell, rent, or trade your personal data to ad brokers, data exchanges, or third-party marketing networks. Delivery coordinates and phone numbers are shared strictly with the assigned rider and shop owner solely during active delivery execution.</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">3. Data Principal Rights (Access, Correction & Erasure)</h3>
              <p>Under Sections 11 and 12 of the DPDP Act, you possess the right to download a machine-readable copy of your personal data or request permanent erasure of your account. You can exercise these rights directly via the Security section in your Profile or via our public <a href="/account-deletion" className="text-primary underline">Account Deletion Portal</a>.</p>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="prose prose-invert max-w-none animate-fade-in text-sm text-text-muted leading-relaxed space-y-4">
              <h2 className="text-2xl font-bold mb-4 text-text font-heading">Cancellation, Return & Refund Policy</h2>
              <p className="text-xs text-text-muted mb-6">Compliant with Consumer Protection (E-Commerce) Rules 2020</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">1. Order Cancellations</h3>
              <p>Customers can cancel placed orders before the store accepts or confirms preparation without any fee. If cancellation is triggered after preparation has commenced or rider has been dispatched, a nominal cancellation fee may be deducted to compensate merchant perishable losses.</p>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">2. Return Windows by Category</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Perishables, Bakery, Fresh Produce & Dairy:</strong> 48 hours from delivery timestamp.</li>
                <li><strong>General Retail, Hardware & Packaged Goods:</strong> Up to 7 calendar days from delivery timestamp.</li>
              </ul>
              
              <h3 className="text-base font-bold text-text mt-6 mb-2">3. Hybrid Refund Execution</h3>
              <p>Once a return request is validated and approved by staff:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Cash on Delivery (COD) Orders:</strong> Refund is instantly credited to your LocalSampark Customer Wallet balance, available immediately for future orders or payout.</li>
                <li><strong>Online Payments (UPI / Cards / Net Banking):</strong> Refund is routed back to the original source instrument within 5–7 banking business days via our payment gateway partner.</li>
              </ul>
            </div>
          )}

          {activeTab === 'grievance' && (
            <div className="animate-fade-in text-sm text-text-muted leading-relaxed space-y-4">
              <h2 className="text-2xl font-bold mb-2 text-text font-heading">Statutory Grievance Redressal</h2>
              <p className="text-xs text-text-muted mb-6">Designated under Rule 4(5) of the Consumer Protection (E-Commerce) Rules, 2020</p>
              
              <p>For escalation of unresolved disputes, service failures, or regulatory inquiries, consumers can contact our designated Grievance Officer:</p>
              <div className="bg-background-alt p-5 rounded-2xl border border-border space-y-2">
                <p><strong>Officer Name:</strong> Rohan Gosavi</p>
                <p><strong>Designation:</strong> Head of Grievance Redressal & Legal Operations</p>
                <p><strong>Address:</strong> LocalSampark Technologies, Dhanori, Pune, Maharashtra — 411015</p>
                <p><strong>Email:</strong> <a href="mailto:grievance@localsampark.com" className="text-primary underline">grievance@localsampark.com</a></p>
                <p><strong>Acknowledgement SLA:</strong> Within 48 hours of receipt</p>
                <p><strong>Statutory Resolution SLA:</strong> Within 30 calendar days</p>
              </div>

              <div className="pt-4">
                <a href="/legal/grievance" className="btn btn-primary inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold">
                  Open Grievance Ticket Form
                </a>
              </div>
            </div>
          )}

          {activeTab === 'deletion' && (
            <div className="animate-fade-in text-sm text-text-muted leading-relaxed space-y-4">
              <h2 className="text-2xl font-bold mb-2 text-text font-heading">Account & Data Deletion Portal</h2>
              <p className="text-xs text-text-muted mb-6">Google Play Store User Data Policy & Section 12 DPDP Act</p>
              
              <p>In accordance with Google Play Store requirements, any user can permanently delete their account and associated personal data directly through our web portal without installing the mobile application.</p>
              
              <div className="bg-background-alt p-5 rounded-2xl border border-border space-y-2">
                <p><strong>What is deleted:</strong> Profile credentials, mobile number, saved addresses, authentication tokens, and notification history.</p>
                <p><strong>What is retained:</strong> Anonymized financial tax transaction records required by Section 31 of the CGST Act 2017.</p>
              </div>

              <div className="pt-4">
                <a href="/account-deletion" className="btn bg-red-600 hover:bg-red-700 text-white font-bold inline-flex items-center gap-2 py-3 px-6 rounded-xl shadow-lg shadow-red-600/20">
                  <Trash2 size={18} /> Proceed to Account Deletion
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Contact Footer */}
        <div className="mt-8 bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-start gap-4">
          <HelpCircle className="text-primary shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-text mb-1">Statutory Grievance Officer</h3>
            <p className="text-text-muted text-sm">
              Designated Grievance Officer: <strong>Rohan Gosavi</strong><br />
              Email: <a href="mailto:grievance@localsampark.com" className="text-primary underline font-medium">grievance@localsampark.com</a> | Address: Dhanori, Pune, Maharashtra 411015
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
