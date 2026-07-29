import React, { useEffect, useState } from 'react';
import { Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Socket for demonstration
const MockSocket = {
  on: (event, callback) => {
    if (event === 'driver:location:update') {
      setInterval(() => {
        callback({
          lat: 18.5913 + (Math.random() * 0.001),
          lng: 73.8987 + (Math.random() * 0.001),
          speed: 45,
          heading: 90
        });
      }, 3000);
    }
  }
};

export function OrderTrackingView({ orderId, driverName = "Rajesh" }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [status, setStatus] = useState('out_for_delivery'); // pending, preparing, out_for_delivery, delivered

  useEffect(() => {
    MockSocket.on('driver:location:update', (data) => {
      setDriverLocation(data);
    });
  }, [orderId]);

  const steps = [
    { id: 'accepted', label: 'Order Accepted', icon: CheckCircle, active: true },
    { id: 'preparing', label: 'Preparing Package', icon: Package, active: true },
    { id: 'out_for_delivery', label: `Out for Delivery (${driverName})`, icon: Truck, active: status === 'out_for_delivery' || status === 'delivered' },
    { id: 'delivered', label: 'Delivered', icon: Clock, active: status === 'delivered' }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 glass-card p-6">
      <div className="flex-1 min-h-[300px] bg-background-alt rounded-2xl border border-border relative overflow-hidden flex items-center justify-center">
        <p className="text-text-muted font-bold z-0">Live Map Tracking</p>
        
        {driverLocation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, x: (driverLocation.lng - 73.8987) * 10000, y: -(driverLocation.lat - 18.5913) * 10000 }}
            transition={{ duration: 1, ease: 'linear' }}
            className="absolute z-10 bg-white p-2 rounded-full shadow-lg border border-border"
            style={{ left: '50%', top: '50%' }}
          >
            <span className="text-2xl block" style={{ transform: `rotate(${driverLocation.heading}deg)` }}>🚚</span>
          </motion.div>
        )}
      </div>
      
      <div className="w-full md:w-80 flex flex-col gap-6">
        <h3 className="text-xl font-bold">Delivery Status</h3>
        
        <div className="flex flex-col relative">
          {/* Connecting Line */}
          <div className="absolute left-[15px] top-4 bottom-8 w-0.5 bg-border -z-10" />
          
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4 mb-8 last:mb-0 relative z-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 ${
                step.active ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-background-alt text-text-muted border-border'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <span className={`font-bold ${step.active ? 'text-text' : 'text-text-muted'}`}>
                  {step.label}
                </span>
                {step.active && index === steps.filter(s => s.active).length - 1 && (
                  <span className="text-xs text-primary font-semibold mt-1">
                    Arriving in ~15 mins
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
