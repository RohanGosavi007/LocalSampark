import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function HomeServiceManager() {
  const tabs = [
    { name: 'Service Requests' },
    { name: 'Provider Dispatch' },
    { name: 'Track Providers' },
    { name: 'Service Catalog' },
    { name: 'Feedback' }
  ];

  return <ManagerLayout title="Home Services" icon="home" tabs={tabs} />;
}
