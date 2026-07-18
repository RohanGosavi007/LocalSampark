'use client';
import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          padding: '16px',
          fontFamily: 'var(--font-body)',
        },
        success: {
          iconTheme: {
            primary: 'var(--accent)',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: 'white',
          },
        },
      }}
    />
  );
};

export const toast = {
  success: (msg) => hotToast.success(msg),
  error: (msg) => hotToast.error(msg),
  loading: (msg) => hotToast.loading(msg),
  dismiss: (id) => hotToast.dismiss(id),
  custom: (jsx) => hotToast.custom(jsx),
};
