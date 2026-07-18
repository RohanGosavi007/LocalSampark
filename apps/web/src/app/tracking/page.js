'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { 
    CheckCircle2, Clock, Truck, MapPin, 
    Phone, MessageCircle, MoreVertical, Share2, Package
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const TrackingMap = dynamic(() => import('./components/TrackingMap'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-background-alt animate-pulse rounded-3xl border border-border" />
});

export default function TrackingWeb() {
  const [statusStep, setStatusStep] = useState(1);

  useEffect(() => {
    // Simulate order progress
    const timer1 = setTimeout(() => setStatusStep(2), 2000); 
    const timer2 = setTimeout(() => setStatusStep(3), 5000); 
    const timer3 = setTimeout(() => setStatusStep(4), 8000); 
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const steps = [
    { id: 1, title: 'Order Placed', desc: 'Waiting for shop confirmation', time: '10:45 AM' },
    { id: 2, title: 'Order Accepted', desc: 'Sharma Kirana has confirmed', time: '10:46 AM' },
    { id: 3, title: 'Preparing', desc: 'Items are being packed', time: '10:50 AM' },
    { id: 4, title: 'Out for Delivery', desc: 'Agent on the way', time: '10:55 AM' },
    { id: 5, title: 'Delivered', desc: 'Enjoy your order!', time: '--:--' }
  ];

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-5xl">
            
            <div className="flex flex-col md:flex-row gap-8 h-full">
                {/* Left Side: Order Details & Timeline */}
                <div className="w-full md:w-5/12 flex flex-col gap-6">
                    <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-black mb-1 text-text">Order #ORD-1024</h1>
                                <p className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full w-max">Arriving in 15 mins</p>
                            </div>
                            <Button variant="outline" size="sm" icon={Share2} className="rounded-xl">Share</Button>
                        </div>
                        
                        {/* Runner Info (Only if Out for Delivery) */}
                        {statusStep >= 4 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center p-4 bg-background-alt rounded-2xl mb-8 border border-border">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl mr-4 shrink-0">
                                    R
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-text">Raju Kumar</h4>
                                    <p className="text-xs text-text-muted">4.9 ⭐ • MH 12 AB 1234</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-border hover:border-indigo-500 transition-colors shadow-sm">
                                        <MessageCircle size={18} className="text-indigo-600" />
                                    </button>
                                    <button className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
                                        <Phone size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-6">
                            {steps.map((step, i) => {
                                const isCompleted = statusStep > step.id;
                                const isCurrent = statusStep === step.id;
                                const isPending = statusStep < step.id;
                                
                                return (
                                    <div key={step.id} className="flex relative">
                                        {/* Connecting Line */}
                                        {i < steps.length - 1 && (
                                            <div className={`absolute left-[15px] top-[32px] bottom-[-24px] w-0.5 ${isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-border/50'}`}></div>
                                        )}
                                        
                                        <div className="flex flex-col items-center mr-4 relative z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500 ${
                                                isCompleted ? 'bg-emerald-500 text-white' : 
                                                isCurrent ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 
                                                'bg-background-alt border-2 border-border text-text-muted'
                                            }`}>
                                                {isCompleted ? <CheckCircle2 size={16} /> : 
                                                 step.id === 3 ? <Package size={14} /> :
                                                 step.id === 4 ? <Truck size={14} /> :
                                                 step.id === 5 ? <MapPin size={14} /> :
                                                 <Clock size={14} />}
                                            </div>
                                        </div>
                                        <div className="pb-2">
                                            <h3 className={`font-bold text-base ${isPending ? 'text-text-muted' : 'text-text'}`}>{step.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-text-muted">{step.desc}</p>
                                                {!isPending && <span className="text-[10px] font-bold text-text-muted/50">• {step.time}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side: Map */}
                <div className="w-full md:w-7/12 h-[600px] md:h-auto">
                    <div className="w-full h-full bg-background rounded-[2rem] border border-border shadow-sm overflow-hidden relative">
                        <TrackingMap 
                            pickup={[18.5793, 73.8780]} 
                            dropoff={[18.5820, 73.8850]}
                            runnerStart={[18.5800, 73.8800]} 
                        />
                        <div className="absolute top-6 left-6 z-20 bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                            <span className="font-bold text-sm">Live GPS Tracking</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
