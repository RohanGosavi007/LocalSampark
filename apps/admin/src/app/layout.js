import React from 'react';
import './globals.css';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata = {
  title: 'LocalSampark - Admin Dashboard',
  description: 'Control center for the hyper-local neighborhood super-app.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Applies the stored theme before first paint. Must stay in step with
// applyTheme() in context/ThemeContext.js: same key, same markers, same
// elements. Without it the console flashes the wrong palette on every load.
//
// The console defaults to dark when nothing is stored and the OS has no
// preference — operators work in it all day and that is what it has always
// been — but a stored choice and an explicit OS preference both win.
const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('ls_admin_theme');
      var pref = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
      var resolved = pref === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : pref;
      var root = document.documentElement;
      root.classList.toggle('dark', resolved === 'dark');
      root.setAttribute('data-theme', resolved);
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* The background and colour now come from globals.css tokens rather than
          from a hardcoded #0f172a here, so the console can have a light mode. */}
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <ThemeProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
