import React, { useState } from 'react';

export default function ProfessionalManager({ shop }) {
  const [activeTab, setActiveTab] = useState('case_files');

  const tabs = [
    { id: 'case_files', label: 'Case Files & Clients' },
    { id: 'vault', label: 'Secure Document Vault' },
    { id: 'deadlines', label: 'Deadline & Hearing Tracker' },
    { id: 'consultations', label: 'Consultations (Video/In-Person)' },
    { id: 'nda', label: 'Confidentiality Agreements (E-Sign)' },
    { id: 'policy', label: 'Policy Comparison Tool' },
    { id: 'real_estate', label: 'Property Listings' }
  ];

  return (
    <div className="professional-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Professional Services Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage clients, secure docs, hearings, and listings</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'case_files' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Client Matter / Case Files</h3>
            <button className="btn btn-primary">+ New Case File</button>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem 0' }}>Case ID</th>
                <th>Client Name</th>
                <th>Matter</th>
                <th>Status</th>
                <th>Next Action Date</th>
              </tr>
            </thead>
            <tbody>
              {/* Dummy data */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem 0' }}>C-2026-001</td>
                <td>Ramesh Gupta</td>
                <td>Tax Filing 2026</td>
                <td><span className="badge" style={{ background: '#f59e0b', color: 'white' }}>In Progress</span></td>
                <td>31-Jul-2026</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem 0' }}>C-2026-002</td>
                <td>ABC Corp</td>
                <td>NDA Drafting</td>
                <td><span className="badge" style={{ background: '#10b981', color: 'white' }}>Completed</span></td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vault' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Secure Document Vault (Encrypted)</h3>
            <button className="btn btn-primary">Request Document</button>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Securely send and receive Aadhar, PAN, ITR, and highly confidential legal documents here. Access is strictly PIN protected.</p>
          <div style={{ padding: '2rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed var(--primary)', borderRadius: '0.5rem', textAlign: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🔒</span>
            <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Drag and Drop files here to encrypt and upload to vault</p>
          </div>
        </div>
      )}

      {/* Add logic for other tabs... */}
    </div>
  );
}
