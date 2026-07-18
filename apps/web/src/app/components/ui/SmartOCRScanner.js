'use client';
import React, { useState } from 'react';
import { ScanText, Upload, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SmartOCRScanner({ onScanComplete }) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setResult(null);

    // Simulate OCR delay (AI disabled, using mock data)
    setTimeout(() => {
      setIsScanning(false);
      const parsedItems = [
        { name: 'Aashirvaad Atta 5kg', qty: 1 },
        { name: 'Tata Salt 1kg', qty: 2 },
        { name: 'Amul Butter 500g', qty: 1 }
      ];
      setResult(parsedItems);
      if (onScanComplete) onScanComplete(parsedItems);
    }, 2000);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50">
      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
        <ScanText className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">Smart List Scanner</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
        Upload a photo of your handwritten grocery list. We will automatically parse it and add the items to your cart.
      </p>

      {!isScanning && !result && (
        <button 
          onClick={handleSimulatedScan}
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Handwritten List
        </button>
      )}

      {isScanning && (
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-primary animate-pulse">Analyzing handwriting...</p>
        </div>
      )}

      {result && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 rounded-xl border border-green-200 text-left"
        >
          <div className="flex items-center gap-2 text-green-600 mb-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">List Parsed Successfully!</span>
          </div>
          <ul className="space-y-2">
            {result.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-900 font-medium">{item.name}</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">Qty: {item.qty}</span>
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setResult(null)}
            className="w-full mt-4 text-center text-sm text-primary font-medium hover:underline"
          >
            Scan another list
          </button>
        </motion.div>
      )}
    </div>
  );
}
