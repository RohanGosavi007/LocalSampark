import React from 'react';
import { ShoppingCart, Package, IndianRupee, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RetailPOS() {
  return (
    <div className="h-[80vh] flex gap-6">
      {/* Left: Product Grid */}
      <div className="flex-[2] bg-background-alt rounded-2xl border border-border p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cat-retail flex items-center gap-2">
            <Package className="w-5 h-5"/> Quick POS
          </h2>
          <div className="relative w-64">
            <input type="text" placeholder="Search or scan barcode..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background" />
            <ScanLine className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="border border-border rounded-xl p-3 cursor-pointer hover:border-cat-retail transition-all text-center">
              <div className="w-full h-20 bg-background rounded-lg mb-2 flex items-center justify-center">🛒</div>
              <p className="text-sm font-bold truncate">Product {i}</p>
              <p className="text-cat-retail font-bold text-sm">₹{i * 50}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart/Bill */}
      <div className="flex-1 bg-background-alt rounded-2xl border border-border flex flex-col overflow-hidden">
        <div className="p-4 bg-cat-retail/10 border-b border-cat-retail/20">
          <h3 className="font-bold text-cat-retail flex items-center gap-2">
            <ShoppingCart className="w-5 h-5"/> Current Bill
          </h3>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Empty state for now */}
          <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
            <ShoppingCart className="w-12 h-12 mb-2" />
            <p>Cart is empty</p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background">
          <div className="flex justify-between mb-2">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-bold">₹0</span>
          </div>
          <div className="flex justify-between mb-4 text-lg">
            <span className="font-bold">Total</span>
            <span className="font-black text-cat-retail">₹0</span>
          </div>
          <Button className="w-full h-12 text-lg bg-cat-retail hover:bg-cat-retail-dark">
            <IndianRupee className="w-5 h-5 mr-2" /> Charge ₹0
          </Button>
        </div>
      </div>
    </div>
  );
}
