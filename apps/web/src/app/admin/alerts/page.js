'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, Bell, Send, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AdminAlertSystem() {
  const [alertType, setAlertType] = useState('promotional'); // promotional, emergency, system
  const [targetAudience, setTargetAudience] = useState('all'); // all, customers, shops, delivery
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSendAlert = () => {
    if (!message) return;
    setStatus('sending');
    
    // Simulate API call to notification service
    setTimeout(() => {
      setStatus('sent');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Admin Alert System
          </h1>
          <p className="text-gray-500 mt-2">Broadcast global push notifications and emergency alerts across the network.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Compose Broadcast
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Alert Type</label>
                  <div className="flex flex-wrap gap-3">
                    {['promotional', 'system', 'emergency'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setAlertType(type)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm border-2 capitalize ${
                          alertType === type 
                            ? type === 'emergency' ? 'border-red-500 bg-red-50 text-red-700' : 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {type === 'emergency' && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Target Audience</label>
                  <div className="flex flex-wrap gap-3">
                    {['all', 'customers', 'shops', 'delivery'].map((target) => (
                      <button
                        key={target}
                        onClick={() => setTargetAudience(target)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm border-2 capitalize ${
                          targetAudience === target 
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message Body</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter alert message (max 150 characters)..."
                    maxLength={150}
                    className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 resize-none font-medium"
                  />
                  <div className="text-right text-xs text-gray-400 font-bold mt-1">
                    {message.length}/150
                  </div>
                </div>

                <Button 
                  className={`w-full h-14 text-lg ${alertType === 'emergency' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={handleSendAlert}
                  disabled={!message || status !== 'idle'}
                  icon={status === 'sent' ? CheckCircle2 : Send}
                >
                  {status === 'sending' ? 'Broadcasting...' : status === 'sent' ? 'Broadcast Complete' : `Send ${alertType} Alert`}
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-gray-900 text-white border-0">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Audience Reach
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Users</span>
                  <span className="font-black text-xl">12,450</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Shops</span>
                  <span className="font-black text-xl">324</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Delivery Agents</span>
                  <span className="font-black text-xl">89</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Estimated Delivery Time</div>
                <div className="font-bold text-green-400">&lt; 2 seconds (FCM)</div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Alert Guidelines</h3>
              <ul className="text-sm text-gray-600 space-y-3 font-medium">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span>Use Emergency alerts ONLY for critical safety broadcasts (SOS, disasters).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>System alerts bypass user notification preferences.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Promotional alerts are limited to 1 per user per day.</span>
                </li>
              </ul>
            </Card>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
