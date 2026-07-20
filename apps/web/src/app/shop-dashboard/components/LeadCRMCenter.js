import React, { useState } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Phone, Mail, UserPlus, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function LeadCRMCenter() {
  const [leads, setLeads] = useState([
    { id: 'LD-1', status: 'new', content: 'Inquiry for 2BHK Flat', contact: 'Amit K.', phone: '9876543210' },
    { id: 'LD-2', status: 'contacted', content: 'Wedding Catering Quote', contact: 'Priya S.', phone: '9123456789' },
    { id: 'LD-3', status: 'qualified', content: 'Bulk Scrap Pickup', contact: 'Rajesh', phone: '9988776655' },
    { id: 'LD-4', status: 'converted', content: 'Software Developer Job', contact: 'Vikram', phone: '9876512345' },
  ]);

  const columns = [
    { id: 'new', title: 'New Leads', color: '#ef4444' },
    { id: 'contacted', title: 'Contacted', color: '#f59e0b' },
    { id: 'qualified', title: 'Qualified', color: '#3b82f6' },
    { id: 'converted', title: 'Converted/Won', color: '#10b981' }
  ];

  const handleStatusChange = (itemId, newStatus) => {
    setLeads(prev => prev.map(o => o.id === itemId ? { ...o, status: newStatus } : o));
  };

  const renderCard = (lead) => (
    <div className="p-4 rounded-xl shadow-sm border border-border bg-background hover:border-cat-directory transition-all">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm text-cat-directory">{lead.id}</h4>
      </div>
      <p className="text-sm font-bold mb-3">{lead.content}</p>
      
      <div className="flex justify-between items-center bg-background-alt p-2 rounded-lg border border-border">
        <span className="text-xs font-bold text-text-muted">{lead.contact}</span>
        <div className="flex gap-2">
          <a href={`tel:${lead.phone}`} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
            <Phone className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cat-directory/10 p-6 rounded-2xl border border-cat-directory/20">
        <div>
          <h1 className="text-2xl font-bold text-cat-directory flex items-center gap-2">
            <UserPlus className="w-6 h-6" /> Lead CRM Center
          </h1>
          <p className="text-text-muted text-sm mt-1">Manage inquiries, directory leads, and sales pipeline</p>
        </div>
        <Button className="bg-cat-directory hover:bg-cat-directory-dark">
          + Add Manual Lead
        </Button>
      </div>

      <OrderKanban 
        columns={columns}
        items={leads}
        onStatusChange={handleStatusChange}
        renderItem={renderCard}
      />
    </div>
  );
}
