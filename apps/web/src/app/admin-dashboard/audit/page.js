'use client';
import React from 'react';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      <main className="min-h-screen bg-slate-950 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black text-white mb-4">System Audit Logs</h1>
          <p className="text-slate-400 text-lg mb-8">This module is currently being provisioned. Check back soon.</p>
          <Link href="/" className="inline-block px-8 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition shadow-lg shadow-purple-600/20">
            Return to Home
          </Link>
        </div>
      </main>
    </>
  );
}
