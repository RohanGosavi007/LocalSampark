'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Tag, Search, Box, Truck, CheckCircle, Clock } from 'lucide-react';

export default function RetailManagerWeb() {
  const [activeTab, setActiveTab] = useState('orders'); // 'pos' or 'orders'
  const [orders, setOrders] = useState([
    { id: '1', customer: 'Rahul K.', status: 'pending', total: '₹450', items: '2 items' },
    { id: '2', customer: 'Priya S.', status: 'preparing', total: '₹1200', items: '5 items' },
    { id: '3', customer: 'Amit D.', status: 'ready_for_pickup', total: '₹300', items: '1 item' },
  ]);

  const updateOrderStatus = (id, newStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    // In real app: fetch(PUT /api/v1/shop/orders/${id}/status)
  };

  const renderKanbanCol = (title, status, icon, nextStatus, nextLabel) => (
    <div className="flex-1 bg-background border border-border rounded-xl p-4 flex flex-col min-w-[250px]">
      <h3 className="font-bold text-text mb-4 flex items-center gap-2 border-b border-border pb-2">
        {icon} {title}
        <span className="ml-auto bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
          {orders.filter(o => o.status === status).length}
        </span>
      </h3>
      <div className="flex flex-col gap-3 flex-1">
        {orders.filter(o => o.status === status).map(order => (
          <div key={order.id} className="bg-background-alt border border-border rounded-lg p-3 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm text-text">#{order.id.padStart(4, '0')}</span>
              <span className="font-black text-primary text-sm">{order.total}</span>
            </div>
            <p className="text-sm text-text-muted mb-3">{order.customer} • {order.items}</p>
            {nextStatus && (
              <button 
                onClick={() => updateOrderStatus(order.id, nextStatus)}
                className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors py-1.5 rounded text-xs font-bold"
              >
                {nextLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-background-alt p-6 rounded-2xl border border-border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Box className="text-primary"/> Retail & Order Manager
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'orders' ? 'bg-primary text-white' : 'bg-background border border-border text-text'}`}
          >
            Kanban Orders
          </button>
          <button 
            onClick={() => setActiveTab('pos')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'pos' ? 'bg-primary text-white' : 'bg-background border border-border text-text'}`}
          >
            POS Checkout
          </button>
        </div>
      </div>
      
      {activeTab === 'pos' ? (
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Left Side: Cart */}
          <div className="flex-1 bg-background border border-border rounded-xl p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Scan barcode or search product..." className="w-full bg-background-alt border border-border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-primary" />
            </div>
            
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-text-muted">
              <Tag className="w-8 h-8 mb-2 opacity-50" />
              <p>Cart is empty. Scan an item.</p>
            </div>
          </div>

          {/* Right Side: Total */}
          <div className="w-full lg:w-80 bg-background border border-border rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-text mb-4 border-b border-border pb-2">Order Summary</h3>
              <div className="flex justify-between text-sm text-text-muted mb-2"><span>Subtotal</span><span>₹0.00</span></div>
              <div className="flex justify-between text-sm text-text-muted mb-2"><span>Tax (GST)</span><span>₹0.00</span></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-6 pt-4 border-t border-border">
                <span className="font-bold text-text text-lg">Total</span>
                <span className="font-black text-primary text-2xl">₹0.00</span>
              </div>
              <button className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-colors">
                Process Payment
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {renderKanbanCol('New Orders', 'pending', <Clock className="w-4 h-4 text-orange-500" />, 'preparing', 'Accept & Prepare')}
          {renderKanbanCol('Preparing', 'preparing', <Box className="w-4 h-4 text-blue-500" />, 'ready_for_pickup', 'Mark as Ready')}
          {renderKanbanCol('Ready / Dispatch', 'ready_for_pickup', <Truck className="w-4 h-4 text-purple-500" />, 'dispatched', 'Dispatch Agent')}
          {renderKanbanCol('Dispatched', 'dispatched', <CheckCircle className="w-4 h-4 text-green-500" />, null, '')}
        </div>
      )}
    </div>
  );
}
