'use client';
import React, { useState, useEffect, useCallback } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Wrench, ClipboardList, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { apiGet, apiPost, apiPut } from '@/lib/api';

// The shop's own job cards (GET/POST/PUT /shops/my-shop/job-cards). This board used to hold three
// invented repairs for invented customers, and moved cards between columns whose names the
// database rejects ("diagnosing", "repairing"), so a drag could never have been saved.
const columns = [
  { id: 'received', title: 'Received', color: '#94a3b8' },
  { id: 'inspection', title: 'Inspection', color: '#f59e0b' },
  { id: 'in_repair', title: 'In Repair', color: '#3b82f6' },
  { id: 'ready', title: 'Ready', color: '#10b981' },
];

export default function JobCardConsole() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet('/shops/my-shop/job-cards?limit=100');
      setJobs((r.jobCards || []).map((j) => ({
        id: j.id,
        status: columns.some((c) => c.id === j.status) ? j.status : 'received',
        content: j.title || j.job_number,
        number: j.job_number,
        customer: j.customer_name || 'Walk-in customer',
        estimate: j.estimated_cost ? `₹${j.estimated_cost}` : 'No estimate',
      })));
      setError(null);
    } catch (e) {
      setError(e.status === 403 ? 'Job cards are available to shop owners.' : (e.message || 'Job cards could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (itemId, newStatus) => {
    const before = jobs;
    setJobs((prev) => prev.map((o) => (o.id === itemId ? { ...o, status: newStatus } : o)));
    try {
      await apiPut(`/shops/my-shop/job-cards/${itemId}`, { status: newStatus });
    } catch (e) {
      setJobs(before); // not saved: put the card back
      setError(e.message || 'That change was not saved.');
    }
  };

  const addJob = async () => {
    const title = window.prompt('What is the job? (for example: AC servicing)');
    if (!title || !title.trim()) return;
    try {
      await apiPost('/shops/my-shop/job-cards', { title: title.trim() });
      load();
    } catch (e) {
      setError(e.message || 'The job card was not created.');
    }
  };

  const renderCard = (job) => (
    <div className="p-4 rounded-xl shadow-sm border border-border bg-background hover:border-cat-services transition-all">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm text-cat-services">{job.number}</h4>
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
        <div className="flex items-center gap-4">
          <button type="button" onClick={addJob} className="flex items-center gap-1 bg-primary text-white font-bold px-4 py-2 rounded-xl"><Plus className="w-4 h-4" /> New job</button>
          <div className="text-center bg-background p-3 rounded-xl border border-border">
            <p className="text-2xl font-black text-text">{jobs.length}</p>
            <p className="text-xs text-text-muted font-bold">JOBS</p>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-red-500 font-bold">{error}</p>}
      {loading ? <p className="text-text-muted">Loading…</p> : (
        <OrderKanban columns={columns} items={jobs} onStatusChange={handleStatusChange} renderItem={renderCard} />
      )}
    </div>
  );
}
