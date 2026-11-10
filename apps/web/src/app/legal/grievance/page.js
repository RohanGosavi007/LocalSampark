'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ShieldCheck, Mail, MapPin, Clock, Phone, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { apiPost, apiGet } from '@/lib/api';

export default function GrievanceRedressalPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order_dispute');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  // The officer's details are configuration on the server (GRIEVANCE_OFFICER_*),
  // so this page and the API cannot disagree about who the officer is.
  const [officer, setOfficer] = useState(null);
  useEffect(() => {
    apiGet('/support/grievance-officer').then((r) => setOfficer(r.grievanceOfficer)).catch(() => setOfficer(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and a description of your grievance.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        subject: subject.trim(),
        category,
        description: `${description.trim()}\n\nContact Details: ${contactInfo.trim() || 'Not provided'}`,
        // Sent as the order reference the ticket keeps (it was only pasted
        // into the description text).
        ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
        isStatutory: true
      };

      const res = await apiPost('/support/tickets', payload);

      // Only what the server issued. This used to show a made-up ticket number
      // ('GRV-' + random digits) and invented acknowledgement and deadline
      // dates whenever the response lacked them, so a grievance the server
      // never recorded looked registered.
      if (res && res.ticket && res.ticket.id) {
        setResult({
          ticketId: res.ticket.id,
          acknowledgedAt: res.ticket.acknowledgedAt,
          slaDueAt: res.ticket.slaDueAt,
        });
      } else {
        setError(res?.error || 'Failed to submit grievance ticket. Please reach out via email.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to register grievance. Please contact the Grievance Officer directly via email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text flex flex-col">
      <Header />

      <main id="main-content" tabIndex="-1" className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 focus:outline-none">
        
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold text-xs mb-3 border border-blue-500/20">
            <ShieldCheck size={16} /> Statutory Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-text">
            Statutory Grievance Redressal
          </h1>
          <p className="text-text-muted mt-2 text-base max-w-2xl">
            In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020.
          </p>
        </div>

        {/* Officer Contact Card */}
        <div className="bg-card-bg border border-border rounded-3xl p-6 sm:p-8 shadow-xl mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="text-primary" size={22} /> Designated Grievance Officer
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Officer Name</p>
                <p data-testid="grievance-officer-name" className="text-base font-bold text-text mt-0.5">{officer ? officer.name : officer === false ? 'Unavailable — e-mail the address below' : 'Loading…'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Designation</p>
                <p className="font-medium text-text mt-0.5">{officer ? officer.designation : 'Grievance Redressal Officer'}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Registered Operational Office</p>
                  <p className="font-medium text-text mt-0.5">{officer ? officer.address : '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Official Grievance Email</p>
                  <a href={`mailto:${officer ? officer.email : 'grievance@localsampark.com'}`} className="font-bold text-primary hover:underline mt-0.5 block">
                    {officer ? officer.email : 'grievance@localsampark.com'}
                  </a>
                  <a href="mailto:legal@localsampark.com" className="text-xs text-text-muted hover:underline block mt-0.5">
                    legal@localsampark.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Statutory Timelines (Rule 4(5))</p>
                  <p className="font-medium text-text mt-0.5">
                    <strong>48 Hours:</strong> Mandatory formal acknowledgement timestamp<br />
                    <strong>30 Days:</strong> Maximum statutory resolution period
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grievance Ticket Form */}
        <div className="bg-card-bg border border-border rounded-3xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <FileText className="text-primary" size={22} /> Submit Formal Grievance
          </h2>
          <p className="text-sm text-text-muted mb-6">
            If an issue with an order, seller, or platform experience was not resolved through customer care, file a statutory ticket below.
          </p>

          {result ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Grievance Registered Successfully</h3>
              <p className="text-sm text-text-muted mb-4">
                Your complaint has been acknowledged by the Grievance Officer and assigned ticket ID <strong>{result.ticketId}</strong>.
              </p>
              <div className="text-xs text-text-muted space-y-1 bg-background-alt p-4 rounded-xl border border-border max-w-md mx-auto">
                <p>Acknowledged At: {new Date(result.acknowledgedAt).toLocaleString('en-IN')}</p>
                <p>Statutory Resolution Target: {new Date(result.slaDueAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text">Category <span className="text-red-500">*</span></label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input w-full p-3 text-sm rounded-xl"
                  >
                    <option value="order_dispute">Order & Delivery Dispute</option>
                    <option value="refund_issue">Unprocessed Refund</option>
                    <option value="merchant_fraud">Seller Product Quality / Counterfeit</option>
                    <option value="data_privacy">Data Privacy & DPDP Rights</option>
                    <option value="other">Other Regulatory Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text">Associated Order ID (Optional)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. 8477de8e-33da..."
                    className="form-input w-full p-3 text-sm rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text">Grievance Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Concise summary of your grievance"
                  className="form-input w-full p-3 text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text">Your Contact Email or Phone <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="For official communications & updates"
                  className="form-input w-full p-3 text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text">Detailed Description of Facts <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide chronological events, transaction amounts, and evidence details..."
                  className="form-input w-full p-3 text-sm rounded-xl"
                />
              </div>

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20"
              >
                {loading ? 'Submitting Grievance...' : 'Submit Grievance to Legal Officer'}
              </button>
            </form>
          )}

        </div>

      </main>

      <Footer />
    </div>
  );
}
