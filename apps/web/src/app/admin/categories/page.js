'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Settings, Plus, Edit2, Shield, Activity, Power } from 'lucide-react';
import DynamicIcon from '../../components/DynamicIcon';

export default function AdminCategoryManager() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Grocery & Supermarkets', slug: 'grocery-supermarkets', businessModel: 'product', commission: '5%', status: 'active' },
    { id: 2, name: 'Restaurants & Cafes', slug: 'restaurants-cafes', businessModel: 'product', commission: '8%', status: 'active' },
    { id: 3, name: 'Pharmacy & Healthcare', slug: 'pharmacy-healthcare', businessModel: 'product', commission: '3%', status: 'active' },
    { id: 12, name: 'Salon, Beauty & Spa', slug: 'salon-beauty-spa', businessModel: 'appointment', commission: '10%', status: 'active' },
    { id: 19, name: 'Automotive & Mechanic', slug: 'automotive-mechanic', businessModel: 'hybrid', commission: '8%', status: 'active' },
    { id: 40, name: 'Tiffin & Subscription', slug: 'tiffin-meal-subscription', businessModel: 'hybrid', commission: '8%', status: 'active' },
  ]);

  const toggleStatus = (id) => {
    setCategories(categories.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'disabled' : 'active' } : c));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            Category & Commission Management
          </h1>
          <Button icon={Plus} className="bg-indigo-600 hover:bg-indigo-700">Add New Category</Button>
        </div>

        <Card className="overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Icon & Name</th>
                  <th className="px-6 py-4">Business Model</th>
                  <th className="px-6 py-4">Commission %</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                        <DynamicIcon categorySlug={cat.slug} size={20} />
                      </div>
                      <div>
                        {cat.name}
                        <div className="text-xs font-normal text-gray-400 font-mono mt-0.5">{cat.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        cat.businessModel === 'product' ? 'bg-blue-100 text-blue-700' :
                        cat.businessModel === 'appointment' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {cat.businessModel}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">{cat.commission}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 font-bold ${cat.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${cat.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        {cat.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(cat.id)}
                          className={`p-2 rounded-lg transition-colors ${cat.status === 'active' ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
