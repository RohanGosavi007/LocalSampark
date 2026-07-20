'use client';
import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, BatteryWarning, DollarSign } from 'lucide-react';

export default function AIInsightsWidget({ shopId }) {
  const [burnRate, setBurnRate] = useState([]);
  const [surge, setSurge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We would normally fetch from our API here
    // e.g. /api/v1/ai-analytics/1/inventory-burn
    // e.g. /api/v1/ai-analytics/1/surge
    
    // For demonstration of the AI Insights widget:
    setTimeout(() => {
      setBurnRate([
        { id: 101, name: 'Premium Shampoo', burn_status: 'Critical (Under 7 Days)', avg_daily_sales: 4.5 },
        { id: 102, name: 'Milk 1L', burn_status: 'Warning (Under 14 Days)', avg_daily_sales: 12.0 },
      ]);
      setSurge({ multiplier: 1.5, reason: 'Peak Hours - Higher Footfall' });
      setLoading(false);
    }, 1000);
  }, [shopId]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-blue-400 mb-2" />
          <span className="text-gray-500 text-sm">AI analyzing your shop data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-sm border border-indigo-100 mb-6">
      <div className="flex items-center mb-6">
        <Sparkles className="w-6 h-6 text-indigo-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-800">AI Smart Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Surge Pricing Card */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5 mr-2" />
              <h3 className="font-semibold">Dynamic Demand</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {surge?.reason}. We recommend applying a surge multiplier to your services.
            </p>
          </div>
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
            <span className="font-bold text-blue-800 text-lg">{surge?.multiplier}x Surge</span>
            <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition">
              Apply Now
            </button>
          </div>
        </div>

        {/* Inventory Burn Card */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center text-orange-600 mb-2">
            <BatteryWarning className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Inventory Burn-Rate</h3>
          </div>
          <p className="text-gray-600 text-sm mb-3">
            These items are selling faster than usual and will stock out soon.
          </p>
          <div className="space-y-2">
            {burnRate.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${item.burn_status.includes('Critical') ? 'bg-red-100 text-red-700' : 'bg-orange-200 text-orange-800'}`}>
                  {item.burn_status.split('(')[1]?.replace(')', '') || item.burn_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
