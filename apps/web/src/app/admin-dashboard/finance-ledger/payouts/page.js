'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { IndianRupee, Search, CheckCircle, Clock, ArrowRightLeft } from 'lucide-react';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetching from admin API
    setTimeout(() => {
      setPayouts([
        { id: 'PAY-8821', shopName: 'Sharma General Store', amount: '₹12,450', cycle: 'July 1-7', status: 'pending', accDetails: 'HDFC ****4421' },
        { id: 'PAY-8822', shopName: 'QuickFix Garage', amount: '₹8,300', cycle: 'July 1-7', status: 'pending', accDetails: 'SBI ****9012' },
        { id: 'PAY-8820', shopName: 'Fresh Bites Restaurant', amount: '₹24,100', cycle: 'June 24-30', status: 'completed', accDetails: 'ICICI ****1122' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleProcessPayout = (id) => {
    alert(`Processing payout ${id} to bank account via RazorpayX...`);
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <IndianRupee className="w-8 h-8 text-green-600" />
            Shop Payout Settlement
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500 font-bold uppercase">Pending Total</div>
              <div className="text-xl font-black text-gray-900">₹20,750</div>
            </div>
            <Button className="bg-gray-900 hover:bg-black" onClick={() => alert('Processing all pending payouts...')}>Process All Pending</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="space-y-4">
            {payouts.map(payout => (
              <Card key={payout.id} className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${payout.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                      {payout.status === 'pending' ? <Clock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{payout.shopName}</h2>
                      <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                        {payout.id} • Cycle: {payout.cycle} • {payout.accDetails}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-bold uppercase mb-1">Settlement Amount</div>
                      <div className="text-xl font-black text-green-600">{payout.amount}</div>
                    </div>
                    {payout.status === 'pending' ? (
                      <Button variant="outline" icon={ArrowRightLeft} onClick={() => handleProcessPayout(payout.id)}>Settle Now</Button>
                    ) : (
                      <div className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm border border-gray-200">
                        Settled
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
