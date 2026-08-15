'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import { LifeBuoy, MessageSquare, Plus, AlertCircle, CheckCircle } from 'lucide-react';

export default function SupportHelpdesk() {
  const [activeTab, setActiveTab] = useState('open'); // 'open', 'resolved', 'new'

  const tickets = [
    { id: 'TKT-1042', subject: 'Missing item in order ORD-5829', status: 'open', priority: 'high', date: '2 hours ago', from: 'Resident' },
    { id: 'TKT-1040', subject: 'Payout delayed for August week 1', status: 'open', priority: 'medium', date: '1 day ago', from: 'Shop Owner' },
    { id: 'TKT-1035', subject: 'Address mismatch on map', status: 'resolved', priority: 'low', date: '3 days ago', from: 'Rider' }
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />
      
      <div className="max-w-5xl mx-auto p-6 pt-24">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <LifeBuoy className="text-blue-500" size={32} />
              Helpdesk & Support
            </h1>
            <p className="text-text-muted mt-2 font-medium">Manage disputes, missing items, and platform queries.</p>
          </div>
          
          <button 
            onClick={() => setActiveTab('new')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2"
          >
            <Plus size={20} />
            Raise Ticket
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-background p-1 rounded-xl w-fit border border-border">
          {[
            { id: 'open', label: 'Open Tickets' },
            { id: 'resolved', label: 'Resolved' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                activeTab === tab.id 
                  ? 'bg-card-bg text-text shadow-sm border border-border' 
                  : 'text-text-muted hover:text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-background border border-border rounded-3xl p-6 min-h-[400px]">
          
          {activeTab === 'new' ? (
            <div className="max-w-2xl mx-auto py-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Submit a Request</h2>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Issue Type</label>
                  <select className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text outline-none focus:border-blue-500">
                    <option>Order Issue (Missing/Damaged)</option>
                    <option>Payment/Payout Issue</option>
                    <option>Account Access</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Subject</label>
                  <input type="text" placeholder="Brief description of the issue" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Details</label>
                  <textarea rows={5} placeholder="Provide order numbers, screenshots, or any relevant details..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text outline-none focus:border-blue-500"></textarea>
                </div>
                <button type="button" onClick={() => setActiveTab('open')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg">
                  Submit Ticket
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.filter(t => t.status === activeTab).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                  <CheckCircle size={48} className="mb-4 opacity-50" />
                  <p className="font-bold">No {activeTab} tickets found.</p>
                </div>
              ) : (
                tickets.filter(t => t.status === activeTab).map(ticket => (
                  <div key={ticket.id} className="group bg-background border border-border hover:border-border rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        ticket.priority === 'high' ? 'bg-red-500/10 text-red-500' : 
                        ticket.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {ticket.status === 'open' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xs font-bold text-text-muted">{ticket.id}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card-bg text-text-muted">{ticket.from}</span>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{ticket.subject}</h3>
                        <p className="text-text-muted text-sm mt-1 flex items-center gap-2">
                          <MessageSquare size={14} /> Updated {ticket.date}
                        </p>
                      </div>
                    </div>
                    <button className="hidden sm:block px-4 py-2 bg-background border border-border hover:border-slate-500 rounded-lg text-sm font-bold text-text-muted transition-colors">
                      View Thread
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
