'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Users, Activity } from 'lucide-react';

export default function AdminPerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetching from admin API
    setTimeout(() => {
      setMetrics({
        totalShops: 124,
        activeShops: 118,
        topPerformingCategory: 'Restaurants & Cafes',
        avgOrderFulfillmentTime: '24 mins',
        disputesActive: 3,
        shopsAtRisk: [
          { name: "Sharma General Store", issue: "High cancellation rate (12%)", rating: 3.2 },
          { name: "QuickFix Garage", issue: "Late job card deliveries", rating: 3.8 },
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" />
          Territory Performance Dashboard
        </h1>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Total Shops</div>
                <div className="text-3xl font-black">{metrics.totalShops}</div>
                <div className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12 this month</div>
              </Card>
              <Card className="p-6 border-l-4 border-l-green-500">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Active Health</div>
                <div className="text-3xl font-black text-green-600">{Math.round((metrics.activeShops / metrics.totalShops)*100)}%</div>
                <div className="text-xs text-gray-500 font-bold mt-2">{metrics.activeShops} currently accepting orders</div>
              </Card>
              <Card className="p-6 border-l-4 border-l-purple-500">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Top Category</div>
                <div className="text-xl font-black truncate">{metrics.topPerformingCategory}</div>
                <div className="text-xs text-gray-500 font-bold mt-2">Highest GMV volume</div>
              </Card>
              <Card className="p-6 border-l-4 border-l-red-500">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Active Disputes</div>
                <div className="text-3xl font-black text-red-500">{metrics.disputesActive}</div>
                <div className="text-xs text-gray-500 font-bold mt-2">Requires immediate admin attention</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Shops at Risk */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500"/> Shops At Risk</h2>
                <div className="space-y-4">
                  {metrics.shopsAtRisk.map((shop, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-red-50 border border-red-100 rounded-xl">
                      <div>
                        <div className="font-bold text-gray-900">{shop.name}</div>
                        <div className="text-sm text-red-600 font-medium">{shop.issue}</div>
                      </div>
                      <div className="bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm border border-gray-200">
                        ⭐ {shop.rating}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Territory Health Chart Placeholder */}
              <Card className="p-6 flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-[300px]">
                <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-gray-500 font-bold">Category Distribution Chart</h3>
                <p className="text-sm text-gray-400">Chart.js implementation pending</p>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
