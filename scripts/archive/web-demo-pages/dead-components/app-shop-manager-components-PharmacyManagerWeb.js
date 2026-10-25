'use client';
import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

export default function PharmacyManagerWeb() {
  return (
    <div className="bg-background-alt p-6 rounded-2xl border border-border shadow-sm">
      <h2 className="text-xl font-bold mb-6">Prescription Approvals</h2>
      <div className="space-y-4">
        {[
          { id: 'RX-101', name: 'Rahul Sharma', time: '10 mins ago', file: 'Prescription_1.jpg' },
          { id: 'RX-102', name: 'Priya Singh', time: '1 hour ago', file: 'Doc_Image_Final.png' }
        ].map(rx => (
          <div key={rx.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-background border border-border rounded-xl">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-text">{rx.name}</span>
                <span className="text-xs text-text-muted bg-primary/10 px-2 py-0.5 rounded-full">{rx.time}</span>
              </div>
              <div className="flex items-center text-sm text-text-muted">
                <FileText className="w-4 h-4 mr-1" /> {rx.file}
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 px-4 py-2 rounded-lg font-bold transition-colors">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
