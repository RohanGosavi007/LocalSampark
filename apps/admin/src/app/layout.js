import React from 'react';
import './globals.css';
import { AdminAuthProvider } from '../context/AdminAuthContext';

export const metadata = {
  title: 'LocalSampark - Admin Dashboard',
  description: 'Control center for the hyper-local neighborhood super-app.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}
