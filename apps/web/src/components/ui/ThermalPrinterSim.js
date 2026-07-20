import React, { useState } from 'react';
import { Printer } from 'lucide-react';

export default function ThermalPrinterSim({ orderId, items, total }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    // Simulate Bluetooth ESC/POS connection and printing delay
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3000);
    }, 1500);
  };

  return (
    <button 
      onClick={handlePrint}
      disabled={isPrinting || printSuccess}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
        printSuccess 
        ? 'bg-green-100 text-green-600 border border-green-200'
        : isPrinting
        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-wait'
        : 'bg-background hover:bg-gray-50 text-text border border-border'
      }`}
    >
      <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
      {printSuccess ? 'Printed!' : isPrinting ? 'Printing...' : 'Print Receipt'}
    </button>
  );
}
