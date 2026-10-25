'use client';
import React from 'react';
import Shared from '../../shop-manager/components/shared/LeadCRMCenter';

// The shop dashboard and the shop manager show the same lead board, from the same API. This file
// used to be its own copy holding four invented leads ("Inquiry for 2BHK Flat — Amit K.").
export default function LeadCRMCenter() {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null;
  return <Shared token={token} />;
}
