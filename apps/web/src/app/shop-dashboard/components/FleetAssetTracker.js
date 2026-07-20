import React, { useState } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Truck, MapPin, Navigation, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function FleetAssetTracker() {
  const [assets, setAssets] = useState([
    { id: 'AST-01', status: 'available', content: 'JCB Excavator 3DX', location: 'Yard A' },
    { id: 'AST-02', status: 'deployed', content: 'Tata Ace Gold', location: 'Site B, Andheri' },
    { id: 'AST-03', status: 'maintenance', content: 'Honda Activa 6G (Rental)', location: 'Workshop' },
  ]);

  const columns = [
    { id: 'available', title: 'Available (Yard)', color: '#10b981' },
    { id: 'deployed', title: 'Deployed / Rented', color: '#3b82f6' },
    { id: 'maintenance', title: 'Maintenance', color: '#f59e0b' }
  ];

  const handleStatusChange = (itemId, newStatus) => {
    setAssets(prev => prev.map(o => o.id === itemId ? { ...o, status: newStatus } : o));
  };

  const renderCard = (asset) => (
    <div className="p-4 rounded-xl shadow-sm border border-border bg-background hover:border-cat-rentals transition-all">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm text-cat-rentals">{asset.id}</h4>
      </div>
      <p className="text-sm font-bold mb-2">{asset.content}</p>
      <div className="flex items-center gap-2">
        <Badge variant={asset.status === 'available' ? 'success' : asset.status === 'deployed' ? 'primary' : 'warning'}>
          <MapPin className="w-3 h-3 inline mr-1"/> {asset.location}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cat-rentals/10 p-6 rounded-2xl border border-cat-rentals/20">
        <div>
          <h1 className="text-2xl font-bold text-cat-rentals flex items-center gap-2">
            <Truck className="w-6 h-6" /> Fleet & Asset Tracker
          </h1>
          <p className="text-text-muted text-sm mt-1">Manage rentals, vehicles, and heavy equipment</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center bg-background p-3 rounded-xl border border-border min-w-[80px]">
            <p className="text-2xl font-black text-text">{assets.filter(a => a.status === 'available').length}</p>
            <p className="text-[10px] text-text-muted font-bold">AVAILABLE</p>
          </div>
          <div className="text-center bg-background p-3 rounded-xl border border-border min-w-[80px]">
            <p className="text-2xl font-black text-cat-rentals">{assets.filter(a => a.status === 'deployed').length}</p>
            <p className="text-[10px] text-cat-rentals font-bold">DEPLOYED</p>
          </div>
        </div>
      </div>

      <OrderKanban 
        columns={columns}
        items={assets}
        onStatusChange={handleStatusChange}
        renderItem={renderCard}
      />
    </div>
  );
}
