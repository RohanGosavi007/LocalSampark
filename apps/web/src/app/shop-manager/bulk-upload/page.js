'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { parseCsv, productsFromRows, TEMPLATE_CSV } from '@/lib/catalogCsv.js';

// Reads the CSV in the browser, checks every row, and creates the products one by one
// through the shop's own product endpoint. The result shown is what the server accepted.
// It used to wait three seconds and announce "Successfully imported 1,248 products".
export default function BulkUploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null); // { created, failed: [] , skipped: [] }
  const [fatal, setFatal] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFatal(null);
    setResult(null);
    if (!/\.csv$/i.test(file.name)) {
      setFatal('Please choose a .csv file. In Excel, use File → Save As → CSV.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFatal('That file is larger than 2 MB. Split it into smaller files.');
      return;
    }

    const { products, errors } = productsFromRows(parseCsv(await file.text()));
    if (products.length === 0) {
      setFatal(errors[0] || 'No products found in the file.');
      setResult({ created: 0, failed: [], skipped: errors });
      return;
    }
    if (products.length > 500) {
      setFatal('At most 500 products per file.');
      return;
    }

    setIsUploading(true);
    let created = 0;
    const failed = [];
    for (const p of products) {
      try {
        await apiPost('/shops/my-shop/products', p);
        created += 1;
      } catch (err) {
        failed.push(`${p.name}: ${err.message || 'could not be saved'}`);
        if (err.status === 401 || err.status === 403) { failed.push('Stopped: you are not signed in as a shop owner.'); break; }
      }
    }
    setIsUploading(false);
    setResult({ created, failed, skipped: errors });
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const problems = result ? [...result.skipped, ...result.failed] : [];

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />

      <div className="max-w-4xl mx-auto p-6 pt-24">
        <div className="flex items-center gap-3 mb-8">
          <FileSpreadsheet className="text-green-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-text">Bulk Catalog Upload</h1>
            <p className="text-text-muted mt-1 font-medium">Import products from a CSV file.</p>
          </div>
        </div>

        {fatal && <p role="alert" className="mb-6 text-red-400 font-bold">{fatal}</p>}

        {result && result.created > 0 && (
          <div className="bg-card-bg border-2 border-green-500 rounded-3xl p-8 text-center mb-8">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-text mb-2">{result.created} product{result.created === 1 ? '' : 's'} added</h2>
            <button onClick={() => router.push('/shop-dashboard')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-colors mt-4">
              Return to Dashboard
            </button>
          </div>
        )}

        {problems.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8" role="alert">
            <p className="font-bold text-yellow-500 mb-2">{problems.length} row{problems.length === 1 ? '' : 's'} not imported</p>
            <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
              {problems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-card-bg border border-border rounded-3xl p-8 relative overflow-hidden">
              <input
                type="file"
                accept=".csv"
                disabled={isUploading}
                aria-label="Choose a CSV file of products"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleUpload}
              />
              <div className="flex flex-col items-center justify-center py-12 text-center pointer-events-none">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${isUploading ? 'bg-blue-500/20 text-blue-500 animate-pulse' : 'bg-background-alt text-text-muted'}`}>
                  <UploadCloud size={40} />
                </div>
                <h3 className="text-2xl font-bold text-text mb-2">{isUploading ? 'Adding products…' : 'Choose a CSV file'}</h3>
                <p className="text-text-muted">{isUploading ? 'Please keep this page open.' : 'or click anywhere to browse your computer'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-3xl p-6">
              <h4 className="font-bold text-blue-400 flex items-center gap-2 mb-4"><Download size={20} /> Download Template</h4>
              <p className="text-slate-300 text-sm mb-6">Start from this file so the columns match.</p>
              <button onClick={downloadTemplate} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                Get .CSV Template
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6">
              <h4 className="font-bold text-yellow-500 flex items-center gap-2 mb-3"><AlertTriangle size={18} /> Columns</h4>
              <ul className="text-slate-300 text-sm space-y-2 list-disc list-inside">
                <li>Product Name (required)</li>
                <li>Price (₹) (required, above 0)</li>
                <li>SKU / Barcode</li>
                <li>Category</li>
                <li>Initial Stock (whole number)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
