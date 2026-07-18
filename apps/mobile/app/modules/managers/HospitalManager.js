import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function HospitalManager() {
  const tabs = [
    { name: 'Patient Queue' },
    { name: 'IPD Bed Status' },
    { name: 'OPD Appointments' },
    { name: 'Duty Roster' },
    { name: 'Pharmacy Stock' },
    { name: 'Billing/Insurance' }
  ];

  return <ManagerLayout title="Hospital/Clinic" icon="medkit" tabs={tabs} />;
}
