import React from 'react';
import FieldDashboard from '../../../src/screens/dashboards/FieldDashboard';
import { useAuth } from '../../../src/context/AuthContext';

// The module route shows the same live dashboard as the home tab. This file used to carry its
// own copy with invented figures (23 shops onboarded, ₹15,600 earned) and four invented leads
// ("Fresh Mart Grocery", "Quick Fix Electronics"…) that appeared whenever the request failed.
export default function FieldDashboardModule() {
  const { user } = useAuth();
  return <FieldDashboard user={user} />;
}
