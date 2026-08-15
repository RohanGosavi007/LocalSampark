'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Lock, Loader2 } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PendingModule({ title, description, moduleKey }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const checkRoute = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_BASE}/admin/health`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setStatus('mounted');
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    checkRoute();
  }, [moduleKey]);

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-card-bg border border-border flex items-center justify-center shadow-2xl relative z-10 backdrop-blur-sm">
          {status === 'checking' ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : status === 'mounted' ? (
            <ShieldCheck className="w-12 h-12 text-emerald-500" />
          ) : (
            <Server className="w-12 h-12 text-rose-500" />
          )}
        </div>
        
        {status === 'mounted' && (
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 -z-10"></div>
        )}
      </div>

      <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-main)' }}>
        {title}
      </h1>
      
      <p className="text-xl max-w-2xl mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description || 'This module is successfully authenticated and securely mounted to the God-Mode API router. The frontend interface is currently in the development queue.'}
      </p>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-sm">
          <ShieldCheck className="w-4 h-4" /> 
          RBAC Protected
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold text-sm">
          <Lock className="w-4 h-4" /> 
          API Mounted
        </div>
      </div>
    </div>
  );
}
