import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function ProfessionalManager() {
  const tabs = [
    { name: 'Lead Management' },
    { name: 'Client Consultations' },
    { name: 'Portfolio' },
    { name: 'Quotations' },
    { name: 'Invoices' },
    { name: 'Services' },
    { name: 'Reviews' }
  ];

  return <ManagerLayout title="Professional Services" icon="briefcase" tabs={tabs} />;
}
