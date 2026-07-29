import React from 'react';

/**
 * Rich, colorful SVG icons to replace flat monochrome icons.
 * Mimics modern Indian Ecommerce (Zomato/Swiggy/Zepto) aesthetics.
 */

export const StoreIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="32" width="48" height="28" rx="4" fill="#F97316"/>
    <path d="M4 24L12 8H52L60 24V32H4V24Z" fill="#FB923C"/>
    <rect x="24" y="40" width="16" height="20" rx="2" fill="#FFF7ED"/>
    <circle cx="16" cy="46" r="4" fill="#FFEDD5"/>
    <circle cx="48" cy="46" r="4" fill="#FFEDD5"/>
  </svg>
);

export const CommunityIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="28" fill="#E11D48"/>
    <path d="M20 24C20 20.6863 25.3726 18 32 18C38.6274 18 44 20.6863 44 24C44 27.3137 38.6274 30 32 30C28.2434 30 24.8906 29.1308 22.5186 27.7554L18 30L20 24Z" fill="#FFE4E6"/>
    <path d="M22 40C22 43.3137 27.3726 46 34 46C40.6274 46 46 43.3137 46 40C46 36.6863 40.6274 34 34 34C30.2434 34 26.8906 34.8692 24.5186 36.2446L20 34L22 40Z" fill="#FDA4AF"/>
  </svg>
);

export const DeliveryIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 40H44V20H16L4 30V40Z" fill="#5B21B6"/>
    <rect x="44" y="24" width="16" height="16" rx="2" fill="#8B5CF6"/>
    <circle cx="16" cy="44" r="6" fill="#1E1B4B"/>
    <circle cx="40" cy="44" r="6" fill="#1E1B4B"/>
    <path d="M28 28H36" stroke="#DDD6FE" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export const ProduceIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="36" r="20" fill="#10B981"/>
    <path d="M32 16C36 8 44 8 44 16C44 24 32 24 32 24C32 24 20 24 20 16C20 8 28 8 32 16Z" fill="#059669"/>
  </svg>
);
