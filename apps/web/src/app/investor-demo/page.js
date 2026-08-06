'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import VendorDmsSimulator from '../../components/VendorDmsSimulator';
import DeliveryAgentSimulator from '../../components/DeliveryAgentSimulator';
import BookingSimulator from '../../components/BookingSimulator';
import { Presentation, ArrowRight } from 'lucide-react';

export default function InvestorDemoPage() {
  // Shared state for the Delivery Lifecycle Demo
  const [orderState, setOrderState] = useState('PENDING'); // PENDING -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
  const [deliveryState, setDeliveryState] = useState('UNASSIGNED'); // UNASSIGNED -> HEADING_TO_STORE -> PICKED_UP -> ON_THE_WAY -> DELIVERED
  
  // Isolated state for Booking Lifecycle Demo
  const [bookingState, setBookingState] = useState('REQUESTED'); // REQUESTED -> CONFIRMED -> IN_SERVICE -> COMPLETED

  // Automatic side-effects to synchronize simulators
  // When Vendor marks OUT_FOR_DELIVERY, agent gets assigned automatically for demo purposes
  React.useEffect(() => {
    if (orderState === 'OUT_FOR_DELIVERY' && deliveryState === 'UNASSIGNED') {
      setDeliveryState('HEADING_TO_STORE');
    }
    // When delivery agent marks DELIVERED, sync back to Vendor
    if (deliveryState === 'DELIVERED' && orderState !== 'DELIVERED') {
      setOrderState('DELIVERED');
    }
  }, [orderState, deliveryState]);

  const resetDeliveryDemo = () => {
    setOrderState('PENDING');
    setDeliveryState('UNASSIGNED');
  };

  const resetBookingDemo = () => {
    setBookingState('REQUESTED');
  };

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans" data-theme="dark">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-[1400px]">
          
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Presentation className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-heading text-text tracking-tight mb-4">
              Investor Demo <span className="text-primary">Control Center</span>
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Experience the end-to-end LocalSampark platform architecture in real-time. Click through the simulator panes below to see how state propagates instantly from Merchant to Delivery Agent.
            </p>
          </div>

          <div className="space-y-12">
            
            {/* Delivery Ecosystem Demo */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text">Hyperlocal Delivery Ecosystem</h2>
                  <p className="text-sm text-text-muted mt-1">Demonstrating: Unified Database State, WebSockets, & Actor Handoff</p>
                </div>
                <button onClick={resetDeliveryDemo} className="text-sm px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors">
                  Reset Delivery Demo
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <VendorDmsSimulator orderState={orderState} setOrderState={setOrderState} />
                
                <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 mt-32 z-10">
                  <div className="bg-background border border-border rounded-full p-2 text-primary shadow-xl">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>

                <DeliveryAgentSimulator deliveryState={deliveryState} setDeliveryState={setDeliveryState} orderState={orderState} />
              </div>
            </section>

            <div className="h-px bg-border/50 w-full" />

            {/* Service Booking Demo */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text">Service & Queue Management</h2>
                  <p className="text-sm text-text-muted mt-1">Demonstrating: Clinics, Salons, & Professional Appointments</p>
                </div>
                <button onClick={resetBookingDemo} className="text-sm px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors">
                  Reset Booking Demo
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <BookingSimulator bookingState={bookingState} setBookingState={setBookingState} />
                <div className="bg-background border border-border rounded-2xl p-8 flex items-center justify-center text-center">
                  <div>
                    <h3 className="text-xl font-bold text-text mb-2">Patient App View</h3>
                    <p className="text-text-muted max-w-sm mx-auto">
                      In production, the customer receives real-time WhatsApp & Push notifications as their appointment transitions from <span className="font-mono text-xs text-primary">{bookingState}</span>.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
