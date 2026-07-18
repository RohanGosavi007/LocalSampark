import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function GarageManager() {
  const tabs = [
    { name: 'Repair Tickets' },
    { name: 'Spare Parts' }
  ];

  return <ManagerLayout title="Garage Management" icon="build" tabs={tabs} />;
}
