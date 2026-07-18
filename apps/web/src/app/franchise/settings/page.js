'use client';
import React, { useState } from 'react';
import FranchiseLayout from '../components/FranchiseLayout';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      alert('Settings Saved successfully');
      setLoading(false);
    }, 1000);
  };

  return (
    <FranchiseLayout activeTab="settings">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Operating Controls</h2>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Delivery Radius Limits (km)</label>
        <input type="number" className="form-input" defaultValue={5} />
      </div>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Active Society Pincode Coverage</label>
        <input type="text" className="form-input" defaultValue="411015" disabled />
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
        {loading ? 'Saving...' : 'Save Controls'}
      </button>
    </FranchiseLayout>
  );
}
