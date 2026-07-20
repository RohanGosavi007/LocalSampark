import React, { useState } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Wrench, Settings, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function JobCardConsole() {
  const [jobs, setJobs] = useState([
    { id: 'JC-1001', status: 'received', content: 'Honda City - AC Servicing', customer: 'Rahul D.', estimate: '₹2500' },
    { id: 'JC-1002', status: 'diagnosing', content: 'MacBook Pro - Screen Flickering', customer: 'Sneha M.', estimate: 'Pending' },
    { id: 'JC-1003', status: 'repairing', content: 'Washing Machine - Drum Issue', customer: 'Vikram S.', estimate: '₹1200' },
  ]);

  const columns = [
    { id: 'received', title: 'Received', color: '#94a3b8' },
    { id: 'diagnosing', title: 'Diagnosing', color: '#f59e0b' },
    { id: 'repairing', title: 'In Repair', color: '#3b82f6' },
    { id: 'ready', title: 'Ready/Done', color: '#10b981' }
  ];

  const handleStatusChange = (itemId, newStatus) => {
    setJobs(prev => prev.map(o => o.id === itemId ? { ...o, status: newStatus } : o));
  };

  const renderCard = (job) => (
    <div className="p-4 rounded-xl shadow-sm border border-border bg-background hover:border-cat-services transition-all">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm text-cat-services">{job.id}</h4>
        <Badge variant="secondary">{job.estimate}</Badge>
      </div>
      <p className="text-sm font-bold mb-1">{job.content}</p>
      <p className="text-xs text-text-muted flex items-center gap-1">
        <ClipboardList className="w-3 h-3" /> {job.customer}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cat-services/10 p-6 rounded-2xl border border-cat-services/20">
        <div>
          <h1 className="text-2xl font-bold text-cat-services flex items-center gap-2">
            <Wrench className="w-6 h-6" /> Job Card Console
          </h1>
          <p className="text-text-muted text-sm mt-1">Track repair milestones and service status</p>
        </div>
        <div className="text-center bg-background p-3 rounded-xl border border-border">
          <p className="text-2xl font-black text-text">{jobs.length}</p>
          <p className="text-xs text-text-muted font-bold">ACTIVE JOBS</p>
        </div>
      </div>

      <OrderKanban 
        columns={columns}
        items={jobs}
        onStatusChange={handleStatusChange}
        renderItem={renderCard}
      />
    </div>
  );
}
