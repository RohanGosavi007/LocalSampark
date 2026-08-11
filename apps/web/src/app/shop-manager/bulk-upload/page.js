'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BulkUploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleUpload = (e) => {
    e.preventDefault();
    setIsUploading(true);
    // Mock parsing and uploading CSV
    setTimeout(() => {
      setIsUploading(false);
      setUploadComplete(true);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6 pt-24">
        
        <div className="flex items-center gap-3 mb-8">
          <FileSpreadsheet className="text-green-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white">Bulk Catalog Upload</h1>
            <p className="text-slate-400 mt-1 font-medium">Import thousands of products instantly via CSV or Excel.</p>
          </div>
        </div>

        {uploadComplete ? (
          <div className="bg-slate-900 border-2 border-green-500 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(34,197,94,0.15)] animate-fade-in">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-2">Upload Successful!</h2>
            <p className="text-slate-400 mb-8">Successfully imported 1,248 products into your catalog.</p>
            <button 
              onClick={() => router.push('/shop-dashboard')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="md:col-span-2">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                <input 
                  type="file" 
                  accept=".csv, .xlsx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handleUpload}
                />
                <div className="flex flex-col items-center justify-center py-12 text-center pointer-events-none">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${isUploading ? 'bg-blue-500/20 text-blue-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    <UploadCloud size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {isUploading ? 'Processing File...' : 'Drag & Drop CSV File'}
                  </h3>
                  <p className="text-slate-400">
                    {isUploading ? 'Mapping columns and inserting products...' : 'or click anywhere to browse your computer'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-3xl p-6">
                <h4 className="font-bold text-blue-400 flex items-center gap-2 mb-4">
                  <Download size={20} /> Download Template
                </h4>
                <p className="text-slate-300 text-sm mb-6">Ensure your CSV matches our required columns for a flawless import.</p>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                  Get .CSV Template
                </button>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6">
                <h4 className="font-bold text-yellow-500 flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} /> Required Columns
                </h4>
                <ul className="text-slate-300 text-sm space-y-2 list-disc list-inside">
                  <li>Product Name</li>
                  <li>SKU / Barcode</li>
                  <li>Price (₹)</li>
                  <li>Category</li>
                  <li>Initial Stock</li>
                </ul>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
