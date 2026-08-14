'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { ShieldAlert, Download, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDataExport = () => {
    // Generate a mock JSON file and trigger download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ user: "Admin", history: [] }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "localsampark_data_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') return;
    setIsDeleting(true);
    // Mock deletion process
    setTimeout(() => {
      localStorage.removeItem('localsampark_token');
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-slate-950 md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-slate-900 p-6 border-b border-slate-800 z-10 flex justify-between items-center">
          <button onClick={() => router.back()} className="text-blue-500 font-bold">← Back</button>
          <h1 className="text-lg font-bold text-white">Security & Privacy</h1>
          <Lock className="text-slate-400" size={20} />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Download className="text-blue-500" />
              Data Export
            </h2>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Under the DPDP Act and GDPR, you have the right to request a copy of your personal data. We will package your order history, profile data, and saved locations into a downloadable JSON file.
            </p>
            <button 
              onClick={handleDataExport}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download My Data
            </button>
          </div>

          <div className="pt-8 border-t border-slate-800">
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <ShieldAlert />
              Danger Zone
            </h2>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <p className="text-red-400 text-sm font-bold">
                  Permanently Delete Account
                </p>
              </div>
              <p className="text-red-400/80 text-xs mb-4">
                This action is irreversible. All your data, wallet balance (LocalCoins), order history, and active subscriptions will be permanently wiped from our servers in compliance with App Store regulations.
              </p>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Type "DELETE" to confirm</label>
                <input 
                  type="text" 
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-slate-950 border border-red-500/30 rounded-xl px-4 py-3 text-red-500 outline-none focus:border-red-500 transition-colors uppercase font-mono" 
                />
              </div>

              <button 
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || isDeleting}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <span className="animate-pulse">Deleting Account...</span>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
