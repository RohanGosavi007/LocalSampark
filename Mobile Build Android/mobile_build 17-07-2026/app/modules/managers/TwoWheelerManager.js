import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function TwoWheelerManager() {
  const tabs = [
    { name: 'Service Appointments' },
    { name: 'Mechanic Allocation' },
    { name: 'Parts Inventory' },
    { name: 'Job Cards' }
  ];

  return <ManagerLayout title="2-Wheeler Garage" icon="bicycle" tabs={tabs} />;
}
