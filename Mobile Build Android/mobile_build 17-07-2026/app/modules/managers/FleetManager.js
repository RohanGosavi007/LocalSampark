import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function FleetManager() {
  const tabs = [
    { name: 'Vehicle Tracking' },
    { name: 'Driver Rosters' },
    { name: 'Trip Logs' }
  ];

  return <ManagerLayout title="Fleet Management" icon="bus" tabs={tabs} />;
}
