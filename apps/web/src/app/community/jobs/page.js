'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Briefcase, MapPin, Clock, IndianRupee, Plus, CheckCircle, Search } from 'lucide-react';

export default function LocalJobsBoard() {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'post'
  const [isPosted, setIsPosted] = useState(false);

  const jobs = [
    { id: 'JOB-101', title: 'Delivery Boy (2 Wheeler)', shop: 'Balaji SuperMart', type: 'Full Time', pay: '15,000/mo', location: 'Dhanori Main Road', urgent: true, posted: '2h ago' },
    { id: 'JOB-102', title: 'Kirana Helper / Packer', shop: 'Green Leaf Veg', type: 'Part Time', pay: '8,000/mo', location: 'Viman Nagar', urgent: false, posted: '1d ago' },
    { id: 'JOB-103', title: 'Pharmacy Counter Staff', shop: 'Apollo Pharmacy', type: 'Full Time', pay: '18,000/mo', location: 'Tingre Nagar', urgent: true, posted: '3d ago' },
  ];

  const handlePostJob = (e) => {
    e.preventDefault();
    setIsPosted(true);
    setTimeout(() => {
      setIsPosted(false);
      setActiveTab('browse');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-5xl mx-auto p-6 pt-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Briefcase className="text-blue-500" size={32} />
              Local Jobs Board
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Find reliable staff for your shop, or find work near your home.</p>
          </div>
          
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('browse')}
              className={`flex-1 md:flex-none px-6 py-3 font-bold transition-colors ${activeTab === 'browse' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Browse Jobs
            </button>
            <button 
              onClick={() => setActiveTab('post')}
              className={`flex-1 md:flex-none px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'post' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Plus size={18} /> Post Job
            </button>
          </div>
        </div>

        {activeTab === 'browse' ? (
          <div className="animate-fade-in space-y-6">
            
            {/* Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4">
              <div className="flex-1 flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800">
                <Search className="text-slate-500" size={20} />
                <input type="text" placeholder="Search for Delivery, Helper, Cashier..." className="w-full bg-transparent outline-none text-white placeholder-slate-500" />
              </div>
              <button className="bg-slate-800 hover:bg-slate-700 px-6 rounded-xl font-bold transition-colors border border-slate-700">Filter</button>
            </div>

            {/* Jobs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map(job => (
                <div key={job.id} className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 transition-all group flex flex-col">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0">🏪</div>
                    {job.urgent && (
                      <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-xs font-black uppercase tracking-wider">
                        Urgent
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-1">{job.title}</h3>
                  <p className="text-slate-400 font-bold mb-6">{job.shop}</p>
                  
                  <div className="space-y-3 mb-8 flex-1">
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <IndianRupee className="text-slate-500" size={16} /> ₹{job.pay}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <MapPin className="text-slate-500" size={16} /> {job.location}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <Clock className="text-slate-500" size={16} /> {job.type} • Posted {job.posted}
                    </div>
                  </div>
                  
                  <button className="w-full bg-slate-800 group-hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-hidden">
            
            {isPosted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <CheckCircle size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Job Posted Successfully</h2>
                <p className="text-slate-400">Your hiring requirement is now live in the community.</p>
              </div>
            ) : (
              <form onSubmit={handlePostJob} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4">Post a Hiring Requirement</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Job Title</label>
                  <input type="text" required placeholder="e.g. Delivery Boy, Cashier" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Salary/Pay (₹)</label>
                    <input type="text" required placeholder="e.g. 15,000/mo" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Job Type</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 appearance-none">
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Contract</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Requirements / Details</label>
                  <textarea rows={4} required placeholder="e.g. Must have a valid driving license and own 2-wheeler..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"></textarea>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <input type="checkbox" id="urgent" className="w-5 h-5 accent-blue-600 rounded border-slate-700" />
                  <label htmlFor="urgent" className="font-bold">Mark as Urgent Hiring</label>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg mt-4">
                  Publish Job Post
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
