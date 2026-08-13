'use client';
import React, { useState, useEffect } from 'react';
import { Receipt, CreditCard, Zap, Droplet, Flame, CheckCircle, Clock, ShieldCheck, Plus, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UtilityBillsDashboard() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [providerType, setProviderType] = useState('Electricity');
  const [customProvider, setCustomProvider] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBills = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/bills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.data);
      }
    } catch (err) {
      toast.error('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleCreateBill = async () => {
    if (!customerName || !phone || !consumerNumber || !amount) return toast.error('Required fields missing');
    const finalProvider = providerType === 'Other' ? customProvider : providerType;
    if (!finalProvider) return toast.error('Provider type is required');

    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/bills', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: customerName, phone, provider_type: finalProvider, consumer_number: consumerNumber, amount: parseFloat(amount) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setCustomerName('');
        setPhone('');
        setConsumerNumber('');
        setAmount('');
        if (providerType === 'Other') setCustomProvider('');
        fetchBills();
      } else {
        toast.error(data.error || 'Failed to log bill');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/bills/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBills();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleClearance = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/bills/${id}/clear`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_cleared: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBills();
      }
    } catch (err) {
      toast.error('Failed to update payment clearance');
    }
  };

  const getProviderIcon = (type) => {
    if (type.toLowerCase().includes('electric')) return <Zap className="w-4 h-4 text-amber-500"/>;
    if (type.toLowerCase().includes('water')) return <Droplet className="w-4 h-4 text-sky-500"/>;
    if (type.toLowerCase().includes('gas')) return <Flame className="w-4 h-4 text-orange-500"/>;
    return <Receipt className="w-4 h-4 text-slate-400"/>;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Receipt className="text-sky-500" /> Utility Bills Engine
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor local bill payment requests, clear financial transactions, and resolve failures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Log Payment
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Customer Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Vikram Singh"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Provider Type</label>
                <select 
                  value={providerType}
                  onChange={e => setProviderType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option>Electricity</option>
                  <option>Water</option>
                  <option>Gas</option>
                  <option>Internet / Broadband</option>
                  <option>DTH</option>
                  <option>Other</option>
                </select>
              </div>

              {providerType === 'Other' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Specify Provider (Free Text)</label>
                  <input 
                    type="text" 
                    value={customProvider}
                    onChange={e => setCustomProvider(e.target.value)}
                    placeholder="e.g. Local Cable TV"
                    className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Account / Consumer ID</label>
                <input 
                  type="text" 
                  value={consumerNumber}
                  onChange={e => setConsumerNumber(e.target.value)}
                  placeholder="e.g. 1029384756"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateBill}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
              >
                <CreditCard className="w-4 h-4" /> {submitting ? 'Processing...' : 'Submit Payment Request'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Requests Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
              <Receipt className="w-5 h-5 text-sky-500" /> Payment Processing Queue
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading bills...</div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No active bill payments.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bills.map(bill => (
                  <div key={bill.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {/* Paid Indicator */}
                    {bill.payment_cleared ? (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                    ) : null}

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {getProviderIcon(bill.provider_type)} {bill.provider_type}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 tracking-wider uppercase flex items-center gap-1">
                            ACC: {bill.consumer_number}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          bill.status === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 
                          bill.status === 'failed' ? 'bg-red-500/20 text-red-500' : 
                          bill.status === 'processing' ? 'bg-sky-500/20 text-sky-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded-xl mt-4 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-400">Customer</span>
                          <span className="text-sm font-bold text-white">₹{bill.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-200">{bill.customer_name}</span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1"><Phone className="w-3 h-3"/> {bill.phone}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => toggleClearance(bill.id, bill.payment_cleared)}
                          disabled={bill.status === 'failed'}
                          className={`flex-1 text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${bill.payment_cleared ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 disabled:opacity-50'}`}
                        >
                          <ShieldCheck className="w-3 h-3"/> {bill.payment_cleared ? 'Cleared with Biller' : 'Clear Payment with Biller'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(bill.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {bill.status === 'pending' && (
                          <button onClick={() => updateStatus(bill.id, 'processing')} className="px-3 py-1.5 bg-sky-600/20 text-sky-500 rounded text-xs font-bold hover:bg-sky-600/30">
                            Process
                          </button>
                        )}
                        {bill.status !== 'success' && bill.status !== 'failed' && (
                          <>
                            <button onClick={() => updateStatus(bill.id, 'success')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                              Success
                            </button>
                            <button onClick={() => updateStatus(bill.id, 'failed')} className="px-3 py-1.5 bg-red-600/20 text-red-500 rounded text-xs font-bold hover:bg-red-600/30">
                              Failed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
