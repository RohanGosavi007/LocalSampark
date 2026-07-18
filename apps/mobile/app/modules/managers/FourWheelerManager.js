import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function FourWheelerManager() {
  const tabs = [
    { name: 'Service Appointments' },
    { name: 'Mechanic Allocation' },
    { name: 'Parts Inventory' },
    { name: 'Job Cards' }
  ];

  return <ManagerLayout title="4-Wheeler Garage" icon="car" tabs={tabs} />;
}
