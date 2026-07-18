'use client';
import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="glass-card" style={{ maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🚫</span>
          <h3 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 1.5rem' }}>
            You do not have the required permissions to view this page.
          </p>
          <a href="/dashboard" className="btn btn-primary" style={{ display: 'inline-block', width: '100%' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
