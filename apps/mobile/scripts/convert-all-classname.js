/**
 * COMPREHENSIVE className → StyleSheet.create() Converter
 * =========================================================
 * Converts ALL Tailwind/NativeWind className props to React Native StyleSheet.
 * 
 * Handles:
 *  1. Static: className="flex-1 bg-slate-950"
 *  2. Template literals: className={`flex-1 ${cond ? 'a' : 'b'}`}
 *  3. className on non-RN components (icons) — removes them
 *  4. Inline style merging when both style={} and className={} exist
 * 
 * Usage: node scripts/convert-all-classname.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ========================================================================
// TAILWIND → RN STYLE MAP
// ========================================================================
const TAILWIND_MAP = {
  // Layout
  'flex-1': { flex: 1 },
  'flex-row': { flexDirection: 'row' },
  'flex-col': { flexDirection: 'column' },
  'flex-wrap': { flexWrap: 'wrap' },
  'items-center': { alignItems: 'center' },
  'items-start': { alignItems: 'flex-start' },
  'items-end': { alignItems: 'flex-end' },
  'justify-center': { justifyContent: 'center' },
  'justify-between': { justifyContent: 'space-between' },
  'justify-end': { justifyContent: 'flex-end' },
  'justify-start': { justifyContent: 'flex-start' },
  'self-center': { alignSelf: 'center' },
  'self-end': { alignSelf: 'flex-end' },
  'self-start': { alignSelf: 'flex-start' },
  'items-baseline': { alignItems: 'baseline' },
  'justify-around': { justifyContent: 'space-around' },
  'justify-evenly': { justifyContent: 'space-evenly' },

  // Overflow
  'overflow-hidden': { overflow: 'hidden' },
  'overflow-visible': { overflow: 'visible' },

  // Position
  'relative': { position: 'relative' },
  'absolute': { position: 'absolute' },

  // Display
  'hidden': { display: 'none' },
  'flex': { display: 'flex' },

  // Width/Height
  'w-full': { width: '100%' },
  'w-px': { width: 1 },
  'w-0.5': { width: 2 },
  'w-1/2': { width: '50%' },
  'w-1/3': { width: '33.333%' },
  'w-2/3': { width: '66.667%' },
  'w-1/4': { width: '25%' },
  'w-3/4': { width: '75%' },
  'h-full': { height: '100%' },
  'h-px': { height: 1 },
  'h-0.5': { height: 2 },

  // Text
  'text-white': { color: '#ffffff' },
  'text-black': { color: '#000000' },
  'text-center': { textAlign: 'center' },
  'text-left': { textAlign: 'left' },
  'text-right': { textAlign: 'right' },
  'text-xs': { fontSize: 12 },
  'text-sm': { fontSize: 14 },
  'text-base': { fontSize: 16 },
  'text-lg': { fontSize: 18 },
  'text-xl': { fontSize: 20 },
  'text-2xl': { fontSize: 24 },
  'text-3xl': { fontSize: 30 },
  'text-4xl': { fontSize: 36 },
  'text-5xl': { fontSize: 48 },
  'uppercase': { textTransform: 'uppercase' },
  'lowercase': { textTransform: 'lowercase' },
  'capitalize': { textTransform: 'capitalize' },
  'underline': { textDecorationLine: 'underline' },
  'line-through': { textDecorationLine: 'line-through' },
  'italic': { fontStyle: 'italic' },
  'leading-none': { lineHeight: 1 },
  'leading-tight': { lineHeight: 1.25 },
  'leading-snug': { lineHeight: 1.375 },
  'leading-normal': { lineHeight: 1.5 },
  'leading-relaxed': { lineHeight: 1.625 },
  'leading-loose': { lineHeight: 2 },
  'ml-auto': { marginLeft: 'auto' },
  'mr-auto': { marginRight: 'auto' },

  // Font weight
  'font-thin': { fontWeight: '100' },
  'font-light': { fontWeight: '300' },
  'font-normal': { fontWeight: '400' },
  'font-medium': { fontWeight: '500' },
  'font-semibold': { fontWeight: '600' },
  'font-bold': { fontWeight: '700' },
  'font-extrabold': { fontWeight: '800' },
  'font-black': { fontWeight: '900' },

  // Opacity
  'opacity-0': { opacity: 0 },
  'opacity-5': { opacity: 0.05 },
  'opacity-10': { opacity: 0.1 },
  'opacity-20': { opacity: 0.2 },
  'opacity-25': { opacity: 0.25 },
  'opacity-30': { opacity: 0.3 },
  'opacity-40': { opacity: 0.4 },
  'opacity-50': { opacity: 0.5 },
  'opacity-60': { opacity: 0.6 },
  'opacity-70': { opacity: 0.7 },
  'opacity-75': { opacity: 0.75 },
  'opacity-80': { opacity: 0.8 },
  'opacity-90': { opacity: 0.9 },
  'opacity-100': { opacity: 1 },

  // Z-index
  'z-0': { zIndex: 0 },
  'z-10': { zIndex: 10 },
  'z-20': { zIndex: 20 },
  'z-30': { zIndex: 30 },
  'z-40': { zIndex: 40 },
  'z-50': { zIndex: 50 },
};

// Tailwind color palette → hex
const COLORS = {
  'transparent': 'transparent',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155',
  'slate-800': '#1e293b', 'slate-900': '#0f172a', 'slate-950': '#020617',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db',
  'gray-400': '#9ca3af', 'gray-500': '#6b7280', 'gray-600': '#4b5563', 'gray-700': '#374151',
  'gray-800': '#1f2937', 'gray-900': '#111827', 'gray-950': '#030712',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca', 'red-300': '#fca5a5',
  'red-400': '#f87171', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
  'red-800': '#991b1b', 'red-900': '#7f1d1d', 'red-950': '#450a0a',
  'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c',
  'orange-800': '#9a3412', 'orange-900': '#7c2d12', 'orange-950': '#431407',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d',
  'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309',
  'amber-800': '#92400e', 'amber-900': '#78350f', 'amber-950': '#451a03',
  'yellow-400': '#facc15', 'yellow-500': '#eab308',
  'green-400': '#4ade80', 'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d',
  'green-800': '#166534', 'green-900': '#14532d',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7',
  'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-700': '#047857',
  'emerald-800': '#065f46', 'emerald-900': '#064e3b', 'emerald-950': '#022c22',
  'teal-400': '#2dd4bf', 'teal-500': '#14b8a6', 'teal-600': '#0d9488', 'teal-700': '#0f766e',
  'teal-800': '#115e59', 'teal-900': '#134e4a',
  'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4', 'cyan-600': '#0891b2',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-300': '#93c5fd',
  'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8',
  'blue-800': '#1e40af', 'blue-900': '#1e3a5f',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc',
  'indigo-400': '#818cf8', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca',
  'indigo-800': '#3730a3', 'indigo-900': '#312e81', 'indigo-950': '#1e1b4b',
  'violet-400': '#a78bfa', 'violet-500': '#8b5cf6', 'violet-600': '#7c3aed',
  'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe', 'purple-400': '#c084fc', 'purple-500': '#a855f7',
  'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8', 'purple-900': '#581c87',
  'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef', 'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf',
  'fuchsia-800': '#86198f', 'fuchsia-900': '#701a75',
  'pink-200': '#fbcfe8', 'pink-300': '#f9a8d4', 'pink-400': '#f472b6', 'pink-500': '#ec4899',
  'pink-600': '#db2777', 'pink-700': '#be185d',
  'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af',
  'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c',
  'rose-800': '#9f1239', 'rose-900': '#881337', 'rose-950': '#4c0519',
  'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd', 'sky-300': '#7dd3fc',
  'sky-400': '#38bdf8', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7', 'sky-700': '#0369a1',
  'sky-800': '#075985', 'sky-900': '#0c4a6e', 'sky-950': '#082f49',
  'blue-950': '#172554',
  'white': '#ffffff',
  'black': '#000000',
};

function resolveColor(colorName) {
  // Direct lookup
  if (COLORS[colorName]) return COLORS[colorName];
  
  // Handle rgba/opacity suffixes like "blue-500/30"  
  const slashMatch = colorName.match(/^(.+?)\/(\d+)$/);
  if (slashMatch) {
    const base = COLORS[slashMatch[1]];
    const opacity = parseInt(slashMatch[2]) / 100;
    if (base && base.startsWith('#')) {
      const r = parseInt(base.slice(1,3), 16);
      const g = parseInt(base.slice(3,5), 16);
      const b = parseInt(base.slice(5,7), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    }
  }
  
  // Handle "black/XX" 
  if (colorName.startsWith('black/')) {
    const opacity = parseInt(colorName.split('/')[1]) / 100;
    return `rgba(0,0,0,${opacity})`;
  }
  if (colorName.startsWith('white/')) {
    const opacity = parseInt(colorName.split('/')[1]) / 100;
    return `rgba(255,255,255,${opacity})`;
  }
  
  return null;
}

// Spacing scale
const SPACING = {
  '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12, '3.5': 14,
  '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44,
  '12': 48, '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128,
};

function resolveSpacing(val) {
  if (SPACING[val] !== undefined) return SPACING[val];
  const n = parseFloat(val);
  if (!isNaN(n)) return n * 4; // Default Tailwind scale
  return null;
}

/**
 * Convert a single Tailwind utility class to a RN style object
 */
function twToStyle(cls) {
  cls = cls.trim();
  if (!cls || cls === '') return null;
  
  // Direct lookup
  if (TAILWIND_MAP[cls]) return { ...TAILWIND_MAP[cls] };
  
  // Text color: text-{color}
  let m;
  if ((m = cls.match(/^text-\[(\d+)px\]$/))) {
    return { fontSize: parseInt(m[1]) };
  }
  if ((m = cls.match(/^text-\[#([0-9a-fA-F]+)\]$/))) {
    return { color: `#${m[1]}` };
  }
  if ((m = cls.match(/^text-(.+)$/)) && !['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','center','left','right'].includes(m[1])) {
    const c = resolveColor(m[1]);
    if (c) return { color: c };
  }
  
  // Background color: bg-{color}
  if ((m = cls.match(/^bg-(.+)$/))) {
    // Skip gradient classes — RN doesn't support them inline
    if (m[1].startsWith('gradient-')) return null;
    const c = resolveColor(m[1]);
    if (c) return { backgroundColor: c };
  }
  
  // Border color: border-{color}
  if ((m = cls.match(/^border-(.+)$/)) && !['t','b','l','r','x','y','dashed','solid','dotted'].includes(m[1])) {
    if (m[1].match(/^\d/)) {
      // border-2 etc
      return { borderWidth: parseInt(m[1]) };
    }
    const c = resolveColor(m[1]);
    if (c) return { borderColor: c };
  }
  
  // Border width
  if (cls === 'border') return { borderWidth: 1 };
  if ((m = cls.match(/^border-(\d+)$/))) return { borderWidth: parseInt(m[1]) };
  if (cls === 'border-t') return { borderTopWidth: 1 };
  if (cls === 'border-b') return { borderBottomWidth: 1 };
  if (cls === 'border-l') return { borderLeftWidth: 1 };
  if (cls === 'border-r') return { borderRightWidth: 1 };
  if ((m = cls.match(/^border-t-(\d+)$/))) return { borderTopWidth: parseInt(m[1]) };
  if ((m = cls.match(/^border-b-(\d+)$/))) return { borderBottomWidth: parseInt(m[1]) };
  
  // border-dashed
  if (cls === 'border-dashed') return { borderStyle: 'dashed' };
  if (cls === 'border-solid') return { borderStyle: 'solid' };
  
  // Border-t/b colors
  if ((m = cls.match(/^border-t-(.+)$/))) {
    const c = resolveColor(m[1]);
    if (c) return { borderTopColor: c };
  }
  if ((m = cls.match(/^border-b-(.+)$/))) {
    const c = resolveColor(m[1]);
    if (c) return { borderBottomColor: c };
  }
  
  // Padding
  if ((m = cls.match(/^p-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { padding: v }; }
  if ((m = cls.match(/^px-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingHorizontal: v }; }
  if ((m = cls.match(/^py-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingVertical: v }; }
  if ((m = cls.match(/^pt-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingTop: v }; }
  if ((m = cls.match(/^pb-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingBottom: v }; }
  if ((m = cls.match(/^pl-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingLeft: v }; }
  if ((m = cls.match(/^pr-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { paddingRight: v }; }
  
  // Margin
  if ((m = cls.match(/^m-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { margin: v }; }
  if ((m = cls.match(/^mx-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginHorizontal: v }; }
  if ((m = cls.match(/^my-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginVertical: v }; }
  if ((m = cls.match(/^mt-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginTop: v }; }
  if ((m = cls.match(/^mb-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginBottom: v }; }
  if ((m = cls.match(/^ml-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginLeft: v }; }
  if ((m = cls.match(/^mr-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginRight: v }; }
  
  // Negative margins (e.g., -mt-2)
  if ((m = cls.match(/^-mt-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginTop: -v }; }
  if ((m = cls.match(/^-mb-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginBottom: -v }; }
  if ((m = cls.match(/^-ml-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginLeft: -v }; }
  if ((m = cls.match(/^-mr-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { marginRight: -v }; }
  
  // Negative positioning (e.g., -top-1, -right-10)
  if ((m = cls.match(/^-top-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { top: -v }; }
  if ((m = cls.match(/^-bottom-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { bottom: -v }; }
  if ((m = cls.match(/^-left-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { left: -v }; }
  if ((m = cls.match(/^-right-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { right: -v }; }
  
  // Width
  if ((m = cls.match(/^w-(\d+)$/))) return { width: parseInt(m[1]) * 4 };
  if ((m = cls.match(/^w-\[(\d+)%\]$/))) return { width: `${m[1]}%` };
  if ((m = cls.match(/^w-\[(\d+)px\]$/))) return { width: parseInt(m[1]) };
  
  // Height
  if ((m = cls.match(/^h-(\d+)$/))) return { height: parseInt(m[1]) * 4 };
  if ((m = cls.match(/^h-\[(\d+)px\]$/))) return { height: parseInt(m[1]) };
  if ((m = cls.match(/^h-\[(\d+)%\]$/))) return { height: `${m[1]}%` };
  
  // Min width/height
  if ((m = cls.match(/^min-w-\[(\d+)%\]$/))) return { minWidth: `${m[1]}%` };
  if ((m = cls.match(/^min-h-\[(\d+)px\]$/))) return { minHeight: parseInt(m[1]) };
  
  // Border radius
  if (cls === 'rounded') return { borderRadius: 4 };
  if (cls === 'rounded-sm') return { borderRadius: 2 };
  if (cls === 'rounded-md') return { borderRadius: 6 };
  if (cls === 'rounded-lg') return { borderRadius: 8 };
  if (cls === 'rounded-xl') return { borderRadius: 12 };
  if (cls === 'rounded-2xl') return { borderRadius: 16 };
  if (cls === 'rounded-3xl') return { borderRadius: 24 };
  if (cls === 'rounded-full') return { borderRadius: 9999 };
  if ((m = cls.match(/^rounded-(\d+)$/))) return { borderRadius: parseInt(m[1]) };
  if (cls === 'rounded-t-3xl') return { borderTopLeftRadius: 24, borderTopRightRadius: 24 };
  if (cls === 'rounded-b-3xl') return { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 };
  if (cls === 'rounded-t-2xl') return { borderTopLeftRadius: 16, borderTopRightRadius: 16 };
  if (cls === 'rounded-b-2xl') return { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 };
  
  // Gap
  if ((m = cls.match(/^gap-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { gap: v }; }
  if ((m = cls.match(/^space-x-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { gap: v }; } // Approximate
  if ((m = cls.match(/^space-y-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { gap: v }; } // Approximate
  
  // Line height
  if ((m = cls.match(/^leading-(\d+)$/))) return { lineHeight: parseInt(m[1]) };
  
  // Letter spacing
  if ((m = cls.match(/^tracking-(\d+)$/))) return { letterSpacing: parseInt(m[1]) };
  if ((m = cls.match(/^tracking-\[(\d+)px\]$/))) return { letterSpacing: parseInt(m[1]) };
  if (cls === 'tracking-tight') return { letterSpacing: -0.5 };
  if (cls === 'tracking-wide') return { letterSpacing: 0.5 };
  if (cls === 'tracking-wider') return { letterSpacing: 1 };
  if (cls === 'tracking-widest') return { letterSpacing: 2 };
  
  // Arbitrary font size: text-[10px]
  if ((m = cls.match(/^text-\[(\d+)px\]$/))) return { fontSize: parseInt(m[1]) };
  
  // Inset values
  if ((m = cls.match(/^top-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { top: v }; }
  if ((m = cls.match(/^bottom-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { bottom: v }; }
  if ((m = cls.match(/^left-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { left: v }; }
  if ((m = cls.match(/^right-(\S+)$/))) { const v = resolveSpacing(m[1]); if (v !== null) return { right: v }; }
  
  // Shadow — RN shadows are limited. Convert to basic shadow
  if (cls.startsWith('shadow-')) {
    // We'll skip shadow classes since they need platform-specific handling
    // and most are decorative. They won't cause crashes if omitted.
    return null;
  }
  
  // Active/hover/pseudo — RN doesn't have CSS pseudo-classes  
  if (cls.startsWith('active:') || cls.startsWith('hover:') || cls.startsWith('focus:') || cls.startsWith('last:') || cls.startsWith('first:')) {
    return null;
  }
  
  // Blur — not supported in RN inline styles
  if (cls.startsWith('blur-')) return null;
  
  // Min-width arbitrary values
  if ((m = cls.match(/^min-w-\[(\d+)px\]$/))) return { minWidth: parseInt(m[1]) };
  if ((m = cls.match(/^min-w-\[(\d+)%\]$/))) return { minWidth: `${m[1]}%` };
  if ((m = cls.match(/^max-w-\[(\d+)px\]$/))) return { maxWidth: parseInt(m[1]) };
  
  // Min-width Tailwind scale
  if ((m = cls.match(/^min-w-\[(.+)\]$/))) {
    const val = m[1];
    if (val.endsWith('px')) return { minWidth: parseInt(val) };
    if (val.endsWith('%')) return { minWidth: val };
    return null;
  }
  
  // Flex-specific with percentage widths like w-[48%]
  if ((m = cls.match(/^w-\[(.+)\]$/))) {
    const val = m[1];
    if (val.endsWith('%')) return { width: val };
    if (val.endsWith('px')) return { width: parseInt(val) };
    return null;
  }
  
  // Gradient — not supported in RN inline styles, skip silently
  if (cls.startsWith('from-') || cls.startsWith('to-') || cls.startsWith('via-')) return null;
  
  // Unknown class — skip and warn
  return undefined;
}

/**
 * Convert a full className string into a merged RN style object
 */
function classNameToStyleObj(classString) {
  const classes = classString.split(/\s+/).filter(Boolean);
  const merged = {};
  const unresolved = [];
  
  for (const cls of classes) {
    const result = twToStyle(cls);
    if (result === undefined) {
      unresolved.push(cls);
    } else if (result !== null) {
      Object.assign(merged, result);
    }
    // null means intentionally skipped (shadow, gradient, pseudo-class)
  }
  
  return { style: merged, unresolved };
}

/**
 * Generate a stable, short style key name from classes
 */
function generateStyleName(classes, index) {
  // Take first meaningful classes to build a name
  const parts = classes.split(/\s+/).filter(Boolean).slice(0, 3);
  let name = parts.map(p => p.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')).join('_');
  name = name.replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!name || name.length < 2) name = `style`;
  // Ensure camelCase
  name = name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return `_${name}_${index}`;
}

// ========================================================================
// NON-RN COMPONENTS (className should be REMOVED, not converted)
// ========================================================================
const NON_RN_COMPONENTS = [
  // Lucide icons
  'ChevronLeft', 'ChevronRight', 'ChevronDown', 'ChevronUp',
  'ShieldCheck', 'Users', 'TrendingDown', 'TrendingUp',
  'ShoppingBag', 'Minus', 'Plus', 'Trash2', 'ArrowRight', 'ArrowLeft',
  'ArrowUpRight', 'ArrowDownLeft', 'PlusCircle',
  'Box', 'LayoutGrid', 'Clock', 'AlertCircle', 'AlertTriangle',
  'Calendar', 'MapPin', 'Ticket', 'Sparkles', 'Star',
  'Package', 'Search', 'Edit2', 'Archive', 'CheckCircle2',
  'LayoutDashboard', 'Bell', 'CreditCard', 'Settings',
  'Camera', 'Check', 'X', 'Leaf', 'Navigation',
  'Building', 'Home', 'Heart', 'Phone', 'Mail', 'Globe',
  'Menu', 'Filter', 'Download', 'Upload', 'Share', 'Send',
  'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Info',
  'Wallet', 'Zap', 'Wifi', 'WifiOff',
  // General SVG/icon components — any component starting with capital + single word + icon-like
];

function isNonRNComponent(tagName) {
  if (NON_RN_COMPONENTS.includes(tagName)) return true;
  // Any component from lucide-react-native will have single PascalCase word
  return false;
}

// ========================================================================
// FILE PROCESSOR
// ========================================================================

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip the converter script itself
  if (filePath.includes('convert-classname') || filePath.includes('convert-all-classname')) return null;
  
  // Check if file has className at all
  if (!content.includes('className')) return null;

  const styleEntries = {};
  let styleCounter = 0;
  const warnings = [];
  
  // Track conditional className usages for inline replacement
  
  // PASS 1: Remove className from non-RN components (icons etc.)
  // Pattern: <IconName ...className="..." or className={`...`}...>
  // Simply strip the className prop from these
  content = content.replace(
    /<([A-Z]\w+)(\s[^>]*?)className=(?:"[^"]*"|{`[^`]*`}|\{[^}]*\})([^>]*?)\/?>/g,
    (match, tagName, before, after) => {
      if (isNonRNComponent(tagName)) {
        // Remove className prop, keep everything else
        return `<${tagName}${before}${after}/>`.replace(/\s+\/>/g, ' />').replace(/\s{2,}/g, ' ');
      }
      return match; // Not an icon, leave it
    }
  );
  
  // PASS 2: Convert static className="..." to style={s.styleName}
  // and collect style definitions
  content = content.replace(
    /className="([^"]+)"/g,
    (match, classString) => {
      const { style, unresolved } = classNameToStyleObj(classString);
      if (Object.keys(style).length === 0 && unresolved.length === 0) return '';
      
      const key = `s${styleCounter++}`;
      styleEntries[key] = style;
      
      if (unresolved.length > 0) {
        warnings.push(`  ⚠️  Unresolved classes in s.${key}: ${unresolved.join(', ')}`);
      }
      
      return `style={s.${key}}`;
    }
  );
  
  // PASS 3: Convert dynamic className={`...${cond}...`} to style={[s.base, cond && s.variant]}
  content = content.replace(
    /className=\{`([^`]+)`\}/g,
    (match, template) => {
      // Split template into static parts and dynamic expressions
      // Pattern: static text ${expression} more static text
      const parts = [];
      let remaining = template;
      const dynamicParts = [];
      
      // Extract all ${...} expressions
      const exprRegex = /\$\{([^}]+)\}/g;
      let exprMatch;
      let lastIndex = 0;
      
      while ((exprMatch = exprRegex.exec(template)) !== null) {
        const before = template.substring(lastIndex, exprMatch.index);
        if (before.trim()) parts.push({ type: 'static', value: before.trim() });
        parts.push({ type: 'dynamic', value: exprMatch[1] });
        lastIndex = exprMatch.index + exprMatch[0].length;
      }
      
      const after = template.substring(lastIndex);
      if (after.trim()) parts.push({ type: 'static', value: after.trim() });
      
      // Build style array
      const styleArrayParts = [];
      
      for (const part of parts) {
        if (part.type === 'static') {
          const { style, unresolved } = classNameToStyleObj(part.value);
          if (Object.keys(style).length > 0) {
            const key = `s${styleCounter++}`;
            styleEntries[key] = style;
            styleArrayParts.push(`s.${key}`);
            if (unresolved.length > 0) {
              warnings.push(`  ⚠️  Unresolved classes in s.${key}: ${unresolved.join(', ')}`);
            }
          }
        } else {
          // Dynamic: usually a ternary like `condition ? 'classes-a' : 'classes-b'`
          const ternaryMatch = part.value.match(/^(.+?)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'$/);
          if (ternaryMatch) {
            const [, condition, trueClasses, falseClasses] = ternaryMatch;
            
            if (trueClasses.trim()) {
              const { style: trueStyle, unresolved: trueUnresolved } = classNameToStyleObj(trueClasses);
              if (Object.keys(trueStyle).length > 0) {
                const trueKey = `s${styleCounter++}`;
                styleEntries[trueKey] = trueStyle;
                
                if (falseClasses.trim()) {
                  const { style: falseStyle, unresolved: falseUnresolved } = classNameToStyleObj(falseClasses);
                  if (Object.keys(falseStyle).length > 0) {
                    const falseKey = `s${styleCounter++}`;
                    styleEntries[falseKey] = falseStyle;
                    styleArrayParts.push(`${condition} ? s.${trueKey} : s.${falseKey}`);
                  } else {
                    styleArrayParts.push(`${condition} && s.${trueKey}`);
                  }
                  if (falseUnresolved.length > 0) {
                    warnings.push(`  ⚠️  Unresolved: ${falseUnresolved.join(', ')}`);
                  }
                } else {
                  styleArrayParts.push(`${condition} && s.${trueKey}`);
                }
                if (trueUnresolved.length > 0) {
                  warnings.push(`  ⚠️  Unresolved: ${trueUnresolved.join(', ')}`);
                }
              }
            } else if (falseClasses.trim()) {
              const { style: falseStyle } = classNameToStyleObj(falseClasses);
              if (Object.keys(falseStyle).length > 0) {
                const falseKey = `s${styleCounter++}`;
                styleEntries[falseKey] = falseStyle;
                styleArrayParts.push(`!${condition.trim().startsWith('!') ? condition.trim().substring(1) : `(${condition})`} && s.${falseKey}`);
              }
            }
          } else {
            // Not a ternary — it's a plain expression evaluating to a class string
            // We can't statically convert it. Leave it as inline but try to handle common patterns
            // E.g., index !== items.length - 1 ? 'border-b border-slate-800' : ''
            // Just skip and note
            warnings.push(`  ⚠️  Unhandled dynamic expression: \${${part.value}}`);
          }
        }
      }
      
      if (styleArrayParts.length === 0) return match; // Couldn't convert
      if (styleArrayParts.length === 1 && !styleArrayParts[0].includes('?') && !styleArrayParts[0].includes('&&')) {
        return `style={${styleArrayParts[0]}}`;
      }
      return `style={[${styleArrayParts.join(', ')}]}`;
    }
  );
  
  // PASS 4: Handle remaining className={expression} (non-template-literal)
  content = content.replace(
    /className=\{([^}`]+)\}/g,
    (match, expr) => {
      // If it's just a variable reference, convert to style
      warnings.push(`  ⚠️  Unconverted dynamic className: className={${expr}}`);
      return match; // Leave as-is, manual fix needed
    }
  );
  
  // PASS 5: Merge style props when both exist on same element
  // e.g., style={s.foo} style={{ padding: 16 }} → style={[s.foo, { padding: 16 }]}
  // This handles cases where we converted className to style but an existing style was already there
  content = content.replace(
    /style=\{(s\.\w+)\}\s+style=(\{[^}]+\})/g,
    (match, refStyle, objStyle) => `style={[${refStyle}, ${objStyle}]}`
  );
  content = content.replace(
    /style=(\{[^}]+\})\s+style=\{(s\.\w+)\}/g,
    (match, objStyle, refStyle) => `style={[${refStyle}, ${objStyle}]}`
  );
  // Also handle style={[s.foo, ...]} style={{...}}
  content = content.replace(
    /style=\{(\[[^\]]+\])\}\s+style=(\{\{[^}]+\}\})/g,
    (match, arrStyle, objStyle) => {
      const inner = arrStyle.slice(1, -1); // Remove [ ]
      return `style={[${inner}, ${objStyle.slice(1, -1)}]}`;
    }
  );
  
  // If no styles were created, nothing to do
  if (Object.keys(styleEntries).length === 0) {
    // But we may have removed className from icons
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      return { content, styleEntries: {}, warnings };
    }
    return null;
  }
  
  // PASS 6: Ensure StyleSheet is imported
  if (!content.includes('StyleSheet')) {
    // Add StyleSheet to the react-native import
    content = content.replace(
      /from 'react-native'/,
      (match) => {
        // Find the import line and add StyleSheet
        return match;
      }
    );
    content = content.replace(
      /import \{([^}]+)\} from 'react-native'/,
      (match, imports) => {
        if (!imports.includes('StyleSheet')) {
          return `import {${imports}, StyleSheet } from 'react-native'`;
        }
        return match;
      }
    );
  }
  
  // PASS 7: Generate StyleSheet.create() block and append before the last export or at end
  const styleBlock = generateStyleBlock(styleEntries);
  
  // Find the right place to insert — before the last closing of the file
  // Look for existing StyleSheet.create — if found, merge into it
  if (content.includes('StyleSheet.create(')) {
    // Already has a StyleSheet, append our entries before the closing });
    const insertPoint = content.lastIndexOf('});');
    if (insertPoint !== -1) {
      const newEntries = Object.entries(styleEntries)
        .map(([key, val]) => `  ${key}: ${styleObjToString(val)},`)
        .join('\n');
      content = content.substring(0, insertPoint) + newEntries + '\n' + content.substring(insertPoint);
    }
  } else {
    // No existing StyleSheet — append at end of file
    content = content.trimEnd() + '\n\n' + styleBlock + '\n';
  }
  
  return { content, styleEntries, warnings };
}

function styleObjToString(obj) {
  const entries = Object.entries(obj).map(([k, v]) => {
    if (typeof v === 'string') return `${k}: '${v}'`;
    return `${k}: ${v}`;
  });
  return `{ ${entries.join(', ')} }`;
}

function generateStyleBlock(entries) {
  const lines = Object.entries(entries).map(([key, val]) => {
    return `  ${key}: ${styleObjToString(val)},`;
  });
  return `const s = StyleSheet.create({\n${lines.join('\n')}\n});`;
}

// ========================================================================
// FILE SCANNER
// ========================================================================
function findFilesWithClassName(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.gradle', 'build', '.expo', 'dist', '.idea', '.git'].includes(item)) continue;
      findFilesWithClassName(fullPath, results);
    } else if (item.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('className=') || content.includes('className={')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ========================================================================
// MAIN
// ========================================================================
const mobileRoot = path.resolve(__dirname, '..');
const appDir = path.join(mobileRoot, 'app');
const srcDir = path.join(mobileRoot, 'src');

console.log('🔧 LocalSampark className → StyleSheet Converter');
console.log('='.repeat(60));
console.log(`📍 Root: ${mobileRoot}`);
console.log(`🧪 Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (files will be modified)'}\n`);

const allFiles = [...findFilesWithClassName(appDir), ...findFilesWithClassName(srcDir)];
console.log(`📋 Found ${allFiles.length} files with className usage\n`);

let converted = 0;
let failed = 0;
let totalStyles = 0;
const allWarnings = [];

for (const filePath of allFiles) {
  const relativePath = path.relative(mobileRoot, filePath);
  
  try {
    const result = processFile(filePath);
    if (!result) {
      console.log(`⏭️  [SKIP] ${relativePath} (already clean or script)`);
      continue;
    }
    
    const styleCount = Object.keys(result.styleEntries).length;
    totalStyles += styleCount;
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, result.content, 'utf8');
    }
    
    console.log(`✅ [DONE] ${relativePath} (${styleCount} styles created)`);
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.log(w));
      allWarnings.push(...result.warnings.map(w => `${relativePath}: ${w.trim()}`));
    }
    
    converted++;
  } catch (err) {
    console.log(`❌ [FAIL] ${relativePath}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Converted: ${converted} files`);
console.log(`📊 Total styles generated: ${totalStyles}`);
console.log(`❌ Failed: ${failed} files`);
if (allWarnings.length > 0) {
  console.log(`⚠️  Warnings: ${allWarnings.length}`);
  console.log(`\nWarning details:`);
  allWarnings.forEach(w => console.log(`  ${w}`));
}
console.log(`${'='.repeat(60)}`);
