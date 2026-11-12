'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { ShieldAlert, Download, Trash2, AlertTriangle, Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, clearSession } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SecurityPage() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const { logout } = useAuth();

  // C1: ends every session of this account: phones, other browsers, this one.
  const handleSignOutEverywhere = async () => {
    setError(null);
    setSigningOut(true);
    const confirmed = await logout({ allDevices: true });
    if (!confirmed) {
      setSigningOut(false);
      setError('We could not reach the server to sign out your other devices. You are signed out here; please try again after signing in.');
      return;
    }
    router.push('/login');
  };

  // Both actions call the privacy API (DPDP access and erasure). The export used to be a
  // file containing { user: "Admin", history: [] } and the deletion only logged the person
  // out after two seconds, leaving the account and its data exactly as they were.
  const handleDataExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const res = await apiGet('/users/me/data-export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'localsampark_data_export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.status === 429 ? 'You can export your data once every 24 hours. Please try again later.' : (err.message || 'Your data could not be exported.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiPost('/users/me/delete-account', { confirmation: 'DELETE_MY_ACCOUNT', reason: 'Requested in app' });
      clearSession();
      router.push('/login');
    } catch (err) {
      setError(err.message || 'Your account could not be deleted. Nothing was changed.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:bg-card-bg">
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-background md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-border md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-card-bg p-6 border-b border-border z-10 flex justify-between items-center">
          <button onClick={() => router.back()} className="text-blue-500 font-bold">← Back</button>
          <h1 className="text-lg font-bold text-text">Security & Privacy</h1>
          <Lock className="text-text-muted" size={20} />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && <p role="alert" className="text-red-500 font-bold text-sm">{error}</p>}
          
          <div>
            <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <Download className="text-blue-500" />
              Data Export
            </h2>
            <p className="text-text-muted text-sm mb-4 leading-relaxed">
              Under the DPDP Act and GDPR, you have the right to request a copy of your personal data. We will package your order history, profile data, and saved locations into a downloadable JSON file.
            </p>
            <button 
              onClick={handleDataExport}
              disabled={isExporting}
              className="w-full bg-card-bg hover:bg-background-alt text-text font-bold py-3 rounded-xl transition-colors border border-border flex items-center justify-center gap-2"
            >
              <Download size={18} />
              {isExporting ? 'Preparing…' : 'Download My Data'}
            </button>
          </div>

          <div className="pt-8 border-t border-border">
            <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <LogOut className="text-blue-500" />
              Signed-in devices
            </h2>
            <p className="text-text-muted text-sm mb-4 leading-relaxed">
              Lost a phone, or signed in on someone else&apos;s computer? Sign out everywhere, including here.
            </p>
            <button
              onClick={handleSignOutEverywhere}
              disabled={signingOut}
              className="w-full bg-card-bg hover:bg-background-alt text-text font-bold py-3 rounded-xl transition-colors border border-border flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              {signingOut ? 'Signing out…' : 'Sign out of all devices'}
            </button>
          </div>

          <div className="pt-8 border-t border-border">
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
                  className="w-full bg-background border border-red-500/30 rounded-xl px-4 py-3 text-red-500 outline-none focus:border-red-500 transition-colors uppercase font-mono" 
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
