'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Import all Manager Components
import AnalyticsManager from './components/AnalyticsManager';
import BeautyManager from './components/BeautyManager';
import DoctorManager from './components/DoctorManager';
import EducationEventsManager from './components/EducationEventsManager';
import FleetManager from './components/FleetManager';
import FourWheelerManager from './components/FourWheelerManager';
import GarageManager from './components/GarageManager';
import HospitalManager from './components/HospitalManager';
import POSManager from './components/POSManager';
import RetailManager from './components/RetailManager';
import TwoWheelerManager from './components/TwoWheelerManager';

export default function ShopDashboardPage() {
  const [activeRole, setActiveRole] = useState('Retail/Grocery');

  // We are simulating the "shop" prop that would normally come from the authenticated context
  const mockShop = {
    id: 'sim_123',
    name: 'Simulated Merchant',
    category: activeRole
  };

  const renderManagerComponent = () => {
    switch (activeRole) {
      case 'Analytics': return <AnalyticsManager shop={mockShop} />;
      case 'Beauty': return <BeautyManager shop={mockShop} />;
      case 'Doctor': return <DoctorManager shop={mockShop} />;
      case 'Education/Events': return <EducationEventsManager shop={mockShop} />;
      case 'Fleet/Logistics': return <FleetManager shop={mockShop} />;
      case '4-Wheeler Garage': return <FourWheelerManager shop={mockShop} />;
      case 'Generic Garage': return <GarageManager shop={mockShop} />;
      case 'Hospital': return <HospitalManager shop={mockShop} />;
      case 'POS': return <POSManager shop={mockShop} />;
      case 'Retail/Grocery': return <RetailManager shop={mockShop} />;
      case '2-Wheeler Garage': return <TwoWheelerManager shop={mockShop} />;
      default: return <RetailManager shop={mockShop} />;
    }
  };

  const roles = [
    'Retail/Grocery', '2-Wheeler Garage', '4-Wheeler Garage', 'Generic Garage',
    'Hospital', 'Doctor', 'Beauty', 'Education/Events', 'Fleet/Logistics', 'Analytics', 'POS'
  ];

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-7xl">
          
          {/* Developer Role Switcher (Simulation Wrapper) */}
          <div className="glass-card p-6 rounded-3xl border border-primary/30 bg-primary/5 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              🛠️ Developer Role Simulator
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Select a business category to dynamically load the specialized dashboard component that was built during the transformation but left disconnected.
            </p>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button 
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeRole === role ? 'bg-primary text-white shadow-md' : 'bg-background border border-border text-text hover:border-primary/50'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamically Rendered Component */}
          {renderManagerComponent()}

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
