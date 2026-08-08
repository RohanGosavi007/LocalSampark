/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--primary-light)',
        'primary-glass': 'var(--primary-glass)',
        secondary: 'var(--secondary)',
        'secondary-hover': 'var(--secondary-hover)',
        'secondary-light': 'var(--secondary-light)',
        'secondary-glass': 'var(--secondary-glass)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-glass': 'var(--accent-glass)',
        background: 'var(--background)',
        'background-alt': 'var(--background-alt)',
        'card-bg': 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'nav-bg': 'var(--nav-bg)',
        'glow-color': 'var(--glow-color)',
        // Spatial Design System — Mesh Gradient Stops
        'mesh-1': '#0F172A',   // Deep Slate
        'mesh-2': '#1E1B4B',   // Vivid Indigo
        'mesh-3': '#064E3B',   // Deep Emerald
        'mesh-4': '#7C2D12',   // Warm Coral
        'mesh-5': '#78350F',   // Rich Amber
        // Glass surfaces
        'glass-white': 'rgba(255, 255, 255, 0.04)',
        'glass-white-10': 'rgba(255, 255, 255, 0.10)',
        'glass-white-20': 'rgba(255, 255, 255, 0.20)',
        'glass-dark': 'rgba(0, 0, 0, 0.40)',
        'glass-dark-60': 'rgba(0, 0, 0, 0.60)',
        // Category Archetype Accent Colors
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
        // Dynamic category tokens
        'cat-primary': 'var(--cat-primary, var(--primary))',
        'cat-primary-light': 'var(--cat-primary-light, var(--primary-light))',
        'cat-primary-glass': 'var(--cat-primary-glass, var(--primary-glass))',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm-token': 'var(--radius-sm)',
        'token': 'var(--radius)',
        'lg-token': 'var(--radius-lg)',
        'full': '9999px',
      },
      backdropBlur: {
        '3xl': '64px',
        '4xl': '80px',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'glow': '0 0 20px var(--glow-color)',
        'glow-lg': '0 0 40px var(--glow-color)',
        'primary-glow': '0 8px 28px -6px rgba(99, 102, 241, 0.55)',
        'secondary-glow': '0 8px 28px -6px rgba(249, 115, 22, 0.55)',
        'emerald-glow': '0 8px 32px -8px rgba(16, 185, 129, 0.5)',
        'violet-glow': '0 8px 32px -8px rgba(139, 92, 246, 0.5)',
        'rose-glow': '0 8px 32px -8px rgba(225, 29, 72, 0.5)',
        'amber-glow': '0 8px 32px -8px rgba(245, 158, 11, 0.5)',
        'glass-inner': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.1)',
        'glass-glow': '0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px -12px rgba(0,0,0,0.4)',
      },
      animation: {
        'shimmer': 'shimmer 4s linear infinite',
        'blobBounce': 'blobBounce 20s infinite ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'pulseGlow': 'pulseGlow 2.5s ease-in-out infinite',
        'slideInRight': 'slideInRight 0.5s ease-out forwards',
        'fadeInUp': 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'fadeInDown': 'fadeInDown 0.6s ease-out forwards',
        'spinSlow': 'spinSlow 3s linear infinite',
        'gradientMove': 'gradientMove 8s ease infinite',
        'ticker': 'ticker 30s linear infinite',
        // New Spatial Animations
        'levitate': 'levitate 6s ease-in-out infinite',
        'marquee': 'marquee 40s linear infinite',
        'glowPulse': 'glowPulse 3s ease-in-out infinite',
        'meshShift': 'meshShift 20s ease-in-out infinite',
        'tiltShine': 'tiltShine 3s ease-in-out infinite',
        'borderTrace': 'borderTrace 2s ease-out forwards',
        'iconSpin': 'iconSpin 1s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blobBounce: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '33%': { transform: 'scale(1.1) translate(30px, -50px)' },
          '66%': { transform: 'scale(0.9) translate(-20px, 20px)' },
          '100%': { transform: 'scale(1) translate(0, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px var(--glow-color)' },
          '50%': { boxShadow: '0 0 40px var(--glow-color)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        gradientMove: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // ── New Spatial Keyframes ──
        levitate: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) rotate(0.5deg)' },
          '75%': { transform: 'translateY(-4px) rotate(-0.5deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        meshShift: {
          '0%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        tiltShine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        borderTrace: {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
        iconSpin: {
          '0%': { opacity: '0', transform: 'rotateY(90deg) scale(0.5)' },
          '100%': { opacity: '1', transform: 'rotateY(0deg) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
