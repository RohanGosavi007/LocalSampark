'use client';
import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIRecommendations({ context = "global" }) {
  // Static placeholder data (AI disabled as per user preference, but structure remains)
  const recommendations = [
    { id: 1, name: "Premium Filter Coffee", shop: "Sharma Grocers", price: "₹250", reason: "People near you bought this" },
    { id: 2, name: "Organic Honey", shop: "Fresh Mart", price: "₹180", reason: "Often bought with Bread" },
    { id: 3, name: "Whole Wheat Bread", shop: "Daily Bakery", price: "₹45", reason: "Based on past orders" }
  ];

  return (
    <div className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Smart Suggestions</h3>
          <p className="text-sm text-gray-600">Curated for you by LocalSampark</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {recommendations.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="text-xs font-medium text-indigo-600 mb-2">{item.reason}</div>
            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-xs text-gray-500">{item.shop}</p>
                <p className="font-bold text-gray-900">{item.price}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transform group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
