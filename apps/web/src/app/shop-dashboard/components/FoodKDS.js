import React, { useState } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Utensils, Flame, CheckCircle, Clock } from 'lucide-react';

export default function FoodKDS() {
  const [orders, setOrders] = useState([
    { id: '101', status: 'new', content: '2x Margherita Pizza, 1x Coke', time: '10:42 AM', isUrgent: false },
    { id: '102', status: 'prep', content: '1x Veg Burger (No Mayo)', time: '10:35 AM', isUrgent: true },
    { id: '103', status: 'ready', content: '3x Garlic Bread', time: '10:20 AM', isUrgent: false },
  ]);

  const columns = [
    { id: 'new', title: 'New Orders', color: '#3b82f6' },
    { id: 'prep', title: 'Preparing', color: '#f59e0b' },
    { id: 'ready', title: 'Ready / Dispatch', color: '#10b981' }
  ];

  const handleStatusChange = (itemId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === itemId ? { ...o, status: newStatus } : o));
  };

  const renderCard = (order) => (
    <div className={`p-4 rounded-xl shadow-sm border ${order.isUrgent ? 'border-red-500 bg-red-50' : 'border-border bg-background'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm">#{order.id}</h4>
        <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3"/> {order.time}</span>
      </div>
      <p className="text-sm font-medium mb-3">{order.content}</p>
      {order.isUrgent && (
        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold flex w-fit items-center gap-1">
          <Flame className="w-3 h-3"/> PRIORITY
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cat-food/10 p-6 rounded-2xl border border-cat-food/20">
        <div>
          <h1 className="text-2xl font-bold text-cat-food flex items-center gap-2">
            <Utensils className="w-6 h-6" /> Kitchen Display System (KDS)
          </h1>
          <p className="text-text-muted text-sm mt-1">Manage food preparation pipeline</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-text">{orders.filter(o => o.status === 'new').length}</p>
            <p className="text-xs text-text-muted font-bold">NEW</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-text">{orders.filter(o => o.status === 'prep').length}</p>
            <p className="text-xs text-text-muted font-bold">PREP</p>
          </div>
        </div>
      </div>

      <OrderKanban 
        columns={columns}
        items={orders}
        onStatusChange={handleStatusChange}
        renderItem={renderCard}
      />
    </div>
  );
}
