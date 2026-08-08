'use client';
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

// Archetype Dashboards (Phase 2)
import FoodKDS from './components/FoodKDS';
import RetailPOS from './components/RetailPOS';
import QueueReceptionDesk from './components/QueueReceptionDesk';
import JobCardConsole from './components/JobCardConsole';
import FleetAssetTracker from './components/FleetAssetTracker';
import LeadCRMCenter from './components/LeadCRMCenter';
import CampaignManager from './components/CampaignManager';
import AIInsightsWidget from './components/AIInsightsWidget';
import AudioNotifier from '@/components/ui/AudioNotifier';
import { io } from 'socket.io-client';

import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function ShopDashboardPage() {
  const { user, token, loading } = useAuth();
  const isAuthenticated = !!token;
  const router = useRouter();
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (user?.shop_id) {
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
      
      newSocket.on('connect', () => {
        newSocket.emit('join_shop_room', user.shop_id);
      });

      newSocket.on('merchant_new_order', (order) => {
        setHasNewOrder(true);
        setTimeout(() => setHasNewOrder(false), 2000); // Reset chime state after 2 seconds
      });

      setSocket(newSocket);
      return () => newSocket.disconnect();
    }
  }, [user]);

  // Simplified Map: Category slug -> Archetype View + Theme Category
  const getArchetypeConfig = (category) => {
    const map = {
      'restaurants-cafes': { view: 'food', theme: 'food' },
      'tiffin-meal-subscription': { view: 'food', theme: 'food' },
      
      'grocery-supermarkets': { view: 'retail', theme: 'retail' },
      'pharmacy-healthcare': { view: 'retail', theme: 'retail' },
      
      'dentists-orthodontists': { view: 'booking', theme: 'booking' },
      'salon-beauty-spa': { view: 'booking', theme: 'beauty' },
      
      'automotive-mechanic': { view: 'jobcard', theme: 'services' },
      'home-services-plumbers': { view: 'jobcard', theme: 'services' },
      
      'vehicle-rentals': { view: 'fleet', theme: 'rentals' },
      
      'real-estate-brokers': { view: 'crm', theme: 'directory' },
      'jobs-placements': { view: 'crm', theme: 'directory' }
    };
    return map[category] || { view: 'retail', theme: 'retail' };
  };

  const activeCategory = user?.shop_category_slug || 'grocery-supermarkets'; // Fallback if missing
  const config = getArchetypeConfig(activeCategory);

  const renderDashboard = () => {
    switch (config.view) {
      case 'food': return <FoodKDS socket={socket} />;
      case 'retail': return <RetailPOS socket={socket} />;
      case 'booking': return <QueueReceptionDesk socket={socket} />;
      case 'jobcard': return <JobCardConsole socket={socket} />;
      case 'fleet': return <FleetAssetTracker socket={socket} />;
      case 'crm': return <LeadCRMCenter socket={socket} />;
      default: return <RetailPOS socket={socket} />;
    }
  };

  if (loading || !isAuthenticated) return null; // Wait for redirect

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans" data-theme="light" data-category={config.theme}>
      <Header />
      
      {/* Hidden Audio Notifier */}
      <AudioNotifier playSound={hasNewOrder} />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-[1400px] mb-8 flex justify-end">
          <Link href={`/shop-manager/${activeCategory}`} className="btn btn-primary flex items-center gap-2 shadow-lg">
            <Settings className="w-5 h-5" />
            Complete Shop Management
          </Link>
        </div>
        
        <div className="container max-w-[1400px] mb-12">
          <AIInsightsWidget shopId={user?.shop_id || 1} />
          <div className="mt-8">
            {renderDashboard()}
          </div>
        </div>

        <div className="container max-w-[1400px]">
          {/* Universal Tools */}
          <CampaignManager />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
