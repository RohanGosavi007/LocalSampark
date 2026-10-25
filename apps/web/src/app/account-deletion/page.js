'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShieldAlert, Trash2, CheckCircle2, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiPost } from '@/lib/api';

export default function AccountDeletionPage() {
  const { user, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Handle direct authenticated deletion
  const handleAuthenticatedDeletion = async () => {
    if (!confirmed) {
      setError('Please check the confirmation box to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiPost('/users/me/delete-account', {
        confirmation: 'DELETE_MY_ACCOUNT',
        reason: reason || 'User requested via web portal'
      });

      if (res && (res.success || res.data?.success)) {
        setResult({
          success: true,
          message: res.message || res.data?.message || 'Your account and personal data have been scheduled for deletion.',
          requestId: res.requestId || res.data?.requestId
        });
        setTimeout(() => logout(), 4000);
      } else {
        setError(res?.error || res?.data?.error || 'Failed to submit account deletion request.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to submit account deletion request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle unauthenticated public deletion request (Google Play requirement)
  const handlePublicDeletion = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide your registered phone number or email address.');
      return;
    }
    if (!confirmed) {
      setError('Please check the confirmation box to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiPost('/users/account-deletion-request', {
        identifier: identifier.trim(),
        reason: reason || 'Public web portal request'
      });

      if (res && (res.success || res.data?.success)) {
        setResult({
          success: true,
          message: res.message || res.data?.message || 'Deletion request received. Personal data associated with this account will be purged.',
          requestId: res.requestId || res.data?.requestId
        });
      } else {
        setError(res?.error || res?.data?.error || 'Failed to submit deletion request.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to submit deletion request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text flex flex-col">
      <Header />

      <main id="main-content" tabIndex="-1" className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 focus:outline-none">
        <div className="bg-card-bg border border-border rounded-3xl p-6 sm:p-10 shadow-xl">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <Trash2 size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-text">Account & Data Deletion</h1>
              <p className="text-text-muted text-sm mt-1">Google Play Policy & DPDP Act 2023 Statutory Request Portal</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-8 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-amber-600 dark:text-amber-400">Important Information Regarding Account Deletion</p>
                <ul className="list-disc list-inside mt-2 text-text-muted space-y-1">
                  <li>Your user profile, delivery addresses, saved payment tokens, and login credentials will be permanently erased.</li>
                  <li>Active orders must be completed or cancelled before your account can be deleted.</li>
                  <li>Per Section 31 of the Central Goods and Services Tax (CGST) Act, completed order invoices and financial records are retained for the statutory tax compliance period in anonymized form.</li>
                </ul>
              </div>
            </div>
          </div>

          {result ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Request Processed Successfully</h2>
              <p className="text-sm text-text-muted mb-4">{result.message}</p>
              {result.requestId && (
                <p className="text-xs font-mono text-text-muted bg-background-alt inline-block px-3 py-1.5 rounded-lg border border-border">
                  Reference Request ID: {result.requestId}
                </p>
              )}
            </div>
          ) : (
            <div>
              {user ? (
                /* Authenticated user view */
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-background-alt border border-border">
                    <p className="text-sm font-semibold">Currently Signed In:</p>
                    <p className="text-base font-bold text-primary mt-1">{user.fullName || user.phone || user.email || 'Verified User'}</p>
                    <p className="text-xs text-text-muted mt-1">User ID: {user.id}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text">Reason for Deletion (Optional):</label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Help us understand why you are leaving..."
                      className="form-input w-full p-3 text-sm rounded-xl"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="auth-confirm"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="auth-confirm" className="text-sm text-text-muted cursor-pointer">
                      I understand that this action is irreversible and will delete my personal data, saved addresses, and active session.
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                  <button
                    onClick={handleAuthenticatedDeletion}
                    disabled={loading || !confirmed}
                    className="w-full btn bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {loading ? 'Processing Deletion...' : 'Permanently Delete My Account'}
                  </button>
                </div>
              ) : (
                /* Public unauthenticated request view for Google Play / non-logged-in users */
                <form onSubmit={handlePublicDeletion} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text">
                      Registered Phone Number or Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. +91 9876543210 or user@example.com"
                      className="form-input w-full p-3.5 text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text">Reason for Request (Optional):</label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for deletion request..."
                      className="form-input w-full p-3 text-sm rounded-xl"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="pub-confirm"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="pub-confirm" className="text-sm text-text-muted cursor-pointer">
                      I confirm that I am the account holder or authorized representative requesting permanent deletion of this account under the Digital Personal Data Protection Act, 2023.
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !confirmed || !identifier.trim()}
                    className="w-full btn bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {loading ? 'Submitting Request...' : 'Submit Account Deletion Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
            <span>Statutory Grievance Officer: Rohan Gosavi (grievance@localsampark.com)</span>
            <a href="/legal" className="text-primary hover:underline font-semibold">View Legal & Privacy Hub</a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
