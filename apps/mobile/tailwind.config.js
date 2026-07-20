/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Category Archetype Accent Colors for Mobile NativeWind
        'cat-food': '#FF6B00',
        'cat-food-dark': '#DC2626',
        'cat-retail': '#00E676',
        'cat-retail-dark': '#00C853',
        'cat-booking': '#00E5FF',
        'cat-booking-dark': '#2563EB',
        'cat-beauty': '#FF007F',
        'cat-beauty-dark': '#8B5CF6',
        'cat-services': '#FFD600',
        'cat-services-dark': '#F59E0B',
        'cat-rentals': '#10B981',
        'cat-rentals-dark': '#065F46',
        'cat-directory': '#6366F1',
        'cat-directory-dark': '#4F46E5',
      }
    },
  },
  plugins: [],
}
