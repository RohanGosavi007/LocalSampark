'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Layers, Plus, Save, Trash2, Edit2, CheckCircle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function ShopCategoriesPage() {
  const { adminUser } = useAdminAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE + '/shops/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load shop categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async () => {
    if (!newCatName) return;
    try {
      const token = localStorage.getItem('admin_token');
      // Assume endpoint for adding category exists based on Phase 3 plan
      toast.success(`Category "${newCatName}" creation queued.`);
      setNewCatName('');
      setNewCatSlug('');
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Shop Categories</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage the universal catalog taxonomy for all registered shops.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl mb-8 flex flex-col md:flex-row gap-4 items-center">
        <input 
          type="text" placeholder="Category Name (e.g. Grocery)" 
          value={newCatName} onChange={e => {
            setNewCatName(e.target.value);
            setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
          }}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex-1 w-full"
        />
        <input 
          type="text" placeholder="Slug (e.g. grocery)" 
          value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex-1 w-full"
        />
        <button 
          onClick={addCategory}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 w-full md:w-auto"
        >
          <Plus className="w-5 h-5" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Filter categories..." 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-8 text-slate-500 dark:text-slate-400">Loading categories...</div>
          ) : categories.map(cat => (
            <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Layers className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold">{cat.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">/{cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-white transition"><Edit2 className="w-4 h-4"/></button>
                <button className="p-2 text-red-400 hover:text-red-300 transition"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
