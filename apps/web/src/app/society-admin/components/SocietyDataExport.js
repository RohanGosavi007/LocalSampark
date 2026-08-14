'use client';
import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileCode2, Loader2 } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../../lib/api';

const EXPORTS = [
  {
    id: 'tally',
    label: 'Tally Ledger (XML)',
    description: 'Paid maintenance bills as a Tally-importable XML voucher file.',
    path: '/society-integration/tally/xml',
    filename: (month) => `Tally_Export_${month || 'all'}.xml`,
    icon: FileCode2,
    usesMonth: true,
  },
  {
    id: 'bills',
    label: 'Maintenance Bills (Excel)',
    description: 'Full billing register for the selected month, including payment status.',
    path: '/society-integration/export/bills',
    filename: (month) => `Bills_${month || 'all'}.xlsx`,
    icon: FileSpreadsheet,
    usesMonth: true,
  },
  {
    id: 'visitors',
    label: 'Visitor Log (Excel)',
    description: 'Gate entry and exit records for audit and compliance review.',
    path: '/society-integration/export/visitors',
    filename: () => 'Visitors_Export.xlsx',
    icon: FileSpreadsheet,
    usesMonth: false,
  },
];

export default function SocietyDataExport({ societyId }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function handleDownload(exportDef) {
    setBusyId(exportDef.id);
    setError('');

    let objectUrl;
    try {
      const params = new URLSearchParams();
      if (societyId) params.set('societyId', societyId);
      if (exportDef.usesMonth && month) params.set('month', month);
      const qs = params.toString();

      // Downloads are token-authenticated, so fetch as a blob rather than
      // navigating — a plain anchor would not carry the Authorization header.
      const headers = getAuthHeaders();
      delete headers['Content-Type'];

      const res = await fetch(`${API_BASE}${exportDef.path}${qs ? `?${qs}` : ''}`, { headers });

      if (!res.ok) {
        let message = `Export failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {
          /* non-JSON error body — keep the status message */
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error('No records found for the selected period.');
      }

      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = exportDef.filename(month);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBusyId(null);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Data Exports</h2>
          <p className="text-slate-400 text-sm mt-1">
            Download accounting and compliance records for this society.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Billing month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((exportDef) => {
          const Icon = exportDef.icon;
          const isBusy = busyId === exportDef.id;
          return (
            <div
              key={exportDef.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-5"
            >
              <div>
                <Icon size={22} className="text-blue-400" />
                <h3 className="mt-3 font-bold text-slate-100">{exportDef.label}</h3>
                <p className="mt-1 text-sm text-slate-400">{exportDef.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(exportDef)}
                disabled={busyId !== null}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
