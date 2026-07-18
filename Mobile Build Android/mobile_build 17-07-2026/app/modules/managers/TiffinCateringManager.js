import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function TiffinCateringManager() {
  const tabs = [
    { name: 'Daily Menu' },
    { name: 'Subscriptions' },
    { name: 'Delivery Routing' }
  ];

  return <ManagerLayout title="Tiffin & Catering" icon="fast-food" tabs={tabs} />;
}
