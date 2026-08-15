import React from 'react';
import { FileText, Download } from 'lucide-react';

export default function InvoiceGenerator({ order }) {
  const handleDownloadPDF = () => {
    // In a real app, this would use a library like jspdf or trigger a backend PDF generation.
    // For now, we will just open a print dialog.
    window.print();
  };

  // Mock calculation if not provided in order
  const subtotal = order?.total || 450;
  const sgst = (subtotal * 0.09).toFixed(2);
  const cgst = (subtotal * 0.09).toFixed(2);
  const finalTotal = (subtotal + parseFloat(sgst) + parseFloat(cgst)).toFixed(2);

  return (
    <div className="bg-white text-black p-8 rounded-xl shadow-2xl max-w-2xl mx-auto print:shadow-none print:p-0">
      
      {/* Print Controls (Hidden during print) */}
      <div className="flex justify-end mb-6 print:hidden">
        <button 
          onClick={handleDownloadPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">TAX INVOICE</h1>
          <p className="text-text-muted font-bold mt-1">Invoice #{order?.id || 'INV-2026-0892'}</p>
          <p className="text-text-muted text-sm">Date: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-800">{order?.shopName || 'Balaji SuperMart'}</h2>
          <p className="text-text-muted text-sm">Dhanori Main Road, Pune, 411015</p>
          <p className="text-text-muted text-sm font-bold mt-1">GSTIN: 27AADCB2230M1Z2</p>
        </div>
      </div>

      {/* Billed To */}
      <div className="mb-8">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Billed To</p>
        <h3 className="font-bold text-slate-800">{order?.customerName || 'Rahul Sharma'}</h3>
        <p className="text-text-muted text-sm">Flat 402, Ganga Acropolis, Wakad</p>
        <p className="text-text-muted text-sm">Phone: +91-9876543210</p>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-slate-200 text-left">
            <th className="py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Item Description</th>
            <th className="py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Qty</th>
            <th className="py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Rate</th>
            <th className="py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="text-slate-700">
          <tr className="border-b border-slate-100">
            <td className="py-4 font-medium">Ashirvaad Atta 5kg</td>
            <td className="py-4 text-center">1</td>
            <td className="py-4 text-right">₹220.00</td>
            <td className="py-4 text-right font-bold">₹220.00</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4 font-medium">Amul Taaza Milk 1L</td>
            <td className="py-4 text-center">2</td>
            <td className="py-4 text-right">₹65.00</td>
            <td className="py-4 text-right font-bold">₹130.00</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4 font-medium">Tata Salt 1kg</td>
            <td className="py-4 text-center">1</td>
            <td className="py-4 text-right">₹25.00</td>
            <td className="py-4 text-right font-bold">₹25.00</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-bold">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>SGST (9%)</span>
            <span>₹{sgst}</span>
          </div>
          <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-3">
            <span>CGST (9%)</span>
            <span>₹{cgst}</span>
          </div>
          <div className="flex justify-between text-xl font-black text-blue-900 pt-2">
            <span>Total</span>
            <span>₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-text-muted">
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p className="mt-1 font-bold">Thank you for shopping locally via LocalSampark!</p>
      </div>

    </div>
  );
}
