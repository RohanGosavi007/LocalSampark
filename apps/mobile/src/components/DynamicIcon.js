import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import * as PhosphorIcons from 'phosphor-react-native';

// ═══════════════════════════════════════════════════════════════════════
// 55-CATEGORY ICON REGISTRY — Lucide + Phosphor dual mapping (Mobile)
// ═══════════════════════════════════════════════════════════════════════
export const CATEGORY_ICONS = {
  'grocery-supermarkets':       { lucide: 'ShoppingCart',     phosphor: 'ShoppingCart',     color: '#22c55e', emoji: '🛒' },
  'restaurants-cafes':          { lucide: 'UtensilsCrossed',  phosphor: 'ForkKnife',        color: '#f97316', emoji: '🍽️' },
  'pharmacy-healthcare':        { lucide: 'Pill',             phosphor: 'Pill',             color: '#06b6d4', emoji: '💊' },
  'fresh-produce-meat':         { lucide: 'Apple',            phosphor: 'Carrot',           color: '#ef4444', emoji: '🥩' },
  'dairy-sweets-bakery':        { lucide: 'Cake',             phosphor: 'CakeSlice',        color: '#f59e0b', emoji: '🍰' },
  'stationery-gifts-books':     { lucide: 'BookOpen',         phosphor: 'BookOpen',         color: '#8b5cf6', emoji: '📚' },
  'florists-nurseries':         { lucide: 'Flower2',          phosphor: 'Flower',           color: '#ec4899', emoji: '💐' },
  'pet-care-supplies':          { lucide: 'PawPrint',         phosphor: 'PawPrint',         color: '#a855f7', emoji: '🐾' },
  'pooja-samagri-religious':    { lucide: 'Flame',            phosphor: 'Fire',             color: '#f97316', emoji: '🪷' },
  'eyewear-opticians':          { lucide: 'Glasses',          phosphor: 'Eyeglasses',       color: '#6366f1', emoji: '👓' },
  'home-services-plumbers':     { lucide: 'Wrench',           phosphor: 'Wrench',           color: '#3b82f6', emoji: '🔧' },
  'salon-beauty-spa':           { lucide: 'Scissors',         phosphor: 'Scissors',         color: '#ec4899', emoji: '💇' },
  'electricians-electronics':   { lucide: 'Zap',              phosphor: 'Lightning',        color: '#eab308', emoji: '⚡' },
  'tutors-education':           { lucide: 'GraduationCap',    phosphor: 'GraduationCap',    color: '#6366f1', emoji: '🎓' },
  'hardware-sanitary':          { lucide: 'Hammer',           phosphor: 'Hammer',           color: '#78716c', emoji: '🔨' },
  'clothing-fashion':           { lucide: 'Shirt',            phosphor: 'TShirt',           color: '#d946ef', emoji: '👕' },
  'gym-fitness':                { lucide: 'Dumbbell',         phosphor: 'Barbell',          color: '#ef4444', emoji: '💪' },
  'real-estate-brokers':        { lucide: 'Building',         phosphor: 'Buildings',        color: '#0ea5e9', emoji: '🏢' },
  'automotive-mechanic':        { lucide: 'Car',              phosphor: 'Car',              color: '#64748b', emoji: '🚗' },
  'dentists-orthodontists':     { lucide: 'SmilePlus',        phosphor: 'Tooth',            color: '#06b6d4', emoji: '🦷' },
  'pathology-labs':             { lucide: 'Microscope',       phosphor: 'Flask',            color: '#14b8a6', emoji: '🔬' },
  'physiotherapy':              { lucide: 'HeartPulse',       phosphor: 'Heartbeat',        color: '#f43f5e', emoji: '💗' },
  'ayurvedic-homeopathic':      { lucide: 'Leaf',             phosphor: 'Leaf',             color: '#22c55e', emoji: '🌿' },
  'pest-control':               { lucide: 'Bug',              phosphor: 'Bug',              color: '#84cc16', emoji: '🐛' },
  'deep-cleaning':              { lucide: 'Sparkles',         phosphor: 'Broom',            color: '#0ea5e9', emoji: '✨' },
  'ac-appliance-repair':        { lucide: 'AirVent',          phosphor: 'Fan',              color: '#0284c7', emoji: '❄️' },
  'ro-water-purifier':          { lucide: 'Droplets',         phosphor: 'Drop',             color: '#38bdf8', emoji: '💧' },
  'laundry-dry-cleaning':       { lucide: 'WashingMachine',   phosphor: 'TShirt',           color: '#6366f1', emoji: '👔' },
  'tailoring-boutiques':        { lucide: 'Ruler',            phosphor: 'Ruler',            color: '#d946ef', emoji: '🧵' },
  'car-bike-wash':              { lucide: 'Droplet',          phosphor: 'Drop',             color: '#3b82f6', emoji: '🚿' },
  'driving-schools':            { lucide: 'CarFront',         phosphor: 'SteeringWheel',    color: '#f97316', emoji: '🚗' },
  'catering-party':             { lucide: 'ChefHat',          phosphor: 'CookingPot',       color: '#f59e0b', emoji: '🎉' },
  'event-planners-decorators':  { lucide: 'PartyPopper',      phosphor: 'Confetti',         color: '#a855f7', emoji: '🎊' },
  'photographers-videographers':{ lucide: 'Camera',           phosphor: 'Camera',           color: '#6366f1', emoji: '📸' },
  'cas-tax-consultants':        { lucide: 'Calculator',       phosphor: 'Calculator',       color: '#64748b', emoji: '📊' },
  'lawyers-advocates':          { lucide: 'Scale',            phosphor: 'Scales',           color: '#78716c', emoji: '⚖️' },
  'insurance-agents':           { lucide: 'Shield',           phosphor: 'Shield',           color: '#0ea5e9', emoji: '🛡️' },
  'yoga-wellness':              { lucide: 'Lotus',            phosphor: 'Flower',           color: '#8b5cf6', emoji: '🧘' },
  'dieticians-nutritionists':   { lucide: 'Salad',            phosphor: 'Bowl',             color: '#22c55e', emoji: '🥗' },
  'tiffin-meal-subscription':   { lucide: 'Soup',             phosphor: 'BowlFood',         color: '#f97316', emoji: '🍱' },
  'mobile-computer-repair':     { lucide: 'Smartphone',       phosphor: 'DeviceMobile',     color: '#6366f1', emoji: '📱' },
  'courier-parcel-services':    { lucide: 'Package',          phosphor: 'Package',           color: '#78716c', emoji: '📦' },
  'travel-agents-visa':         { lucide: 'Plane',            phosphor: 'AirplaneTilt',      color: '#0ea5e9', emoji: '✈️' },
  'printing-xerox-dtp':         { lucide: 'Printer',          phosphor: 'Printer',           color: '#64748b', emoji: '🖨️' },
  'locksmith-key-maker':        { lucide: 'Key',              phosphor: 'Key',               color: '#f59e0b', emoji: '🔑' },
  'packers-movers':             { lucide: 'Truck',            phosphor: 'Truck',             color: '#3b82f6', emoji: '🚚' },
  'water-tanker-supply':        { lucide: 'Droplets',         phosphor: 'Drop',              color: '#38bdf8', emoji: '🚰' },
  'gas-cylinder-lpg':           { lucide: 'Flame',            phosphor: 'Fire',              color: '#ef4444', emoji: '🔥' },
  'jewellery-gold':             { lucide: 'Gem',              phosphor: 'Diamond',           color: '#eab308', emoji: '💎' },
  'wedding-party-planner':      { lucide: 'Heart',            phosphor: 'Heart',             color: '#f43f5e', emoji: '💒' },
  'interior-design-decor':      { lucide: 'PaintBucket',      phosphor: 'PaintBrush',        color: '#a855f7', emoji: '🎨' },
  'painting-renovation':        { lucide: 'Paintbrush',       phosphor: 'PaintRoller',       color: '#f97316', emoji: '🖌️' },
  'security-cctv':              { lucide: 'ShieldCheck',      phosphor: 'ShieldCheck',       color: '#64748b', emoji: '🛡️' },
  'coaching-test-prep':         { lucide: 'BookCheck',        phosphor: 'Exam',              color: '#6366f1', emoji: '🎓' },
  'astrologer-pandit':          { lucide: 'Star',             phosphor: 'Star',              color: '#f59e0b', emoji: '🪷' },
};

// Size presets
const SIZE_MAP = { xs: 14, sm: 16, md: 24, lg: 32, xl: 48 };

/**
 * Enhanced Mobile DynamicIcon
 * @param {string} name - Direct icon name OR auto-resolved via categorySlug
 * @param {string} categorySlug - Category slug for auto-resolve from registry
 * @param {number|string} size - Pixel size or preset ('xs','sm','md','lg','xl')
 * @param {string} color - Color string
 * @param {string} weight - Phosphor weight
 * @param {object} style - RN style
 */
export default function DynamicIcon({ name, categorySlug, size = 24, color = '#000000', weight = 'regular', style }) {
    const [iconTheme, setIconTheme] = useState('lucide');

    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const url = 'http://10.0.2.2:5000/api/v1/settings/theme'; 
                const res = await fetch(url);
                const data = await res.json();
                if (data.success && data.theme) {
                    setIconTheme(data.theme);
                }
            } catch (err) {
                // Silently fallback to lucide
            }
        };
        fetchTheme();
    }, []);

    // Resolve size preset
    const resolvedSize = typeof size === 'string' ? (SIZE_MAP[size] || 24) : size;

    // Auto-resolve from category registry
    let resolvedName = name;
    let resolvedColor = color;

    if (categorySlug && CATEGORY_ICONS[categorySlug]) {
        const catIcon = CATEGORY_ICONS[categorySlug];
        resolvedName = iconTheme === 'phosphor' ? catIcon.phosphor : catIcon.lucide;
        if (color === '#000000' || color === 'currentColor') resolvedColor = catIcon.color;
    }

    if (!resolvedName) return null;

    // Phosphor
    if (iconTheme === 'phosphor') {
        // Intentional dynamic lookup keyed by CATEGORY_ICONS; import/namespace
        // can't statically verify a computed member access into a namespace
        // import, so it's suppressed on the line below rather than reworked.
        // eslint-disable-next-line import/namespace
        const PhosphorComponent = PhosphorIcons[resolvedName];
        if (PhosphorComponent) {
            return <PhosphorComponent size={resolvedSize} color={resolvedColor} style={style} weight={weight} />;
        }
    }

    // Lucide
    const LucideComponent = LucideIcons[resolvedName];
    if (LucideComponent) {
        return <LucideComponent size={resolvedSize} color={resolvedColor} style={style} />;
    }

    // Emoji fallback
    if (categorySlug && CATEGORY_ICONS[categorySlug]) {
        return (
            <Text style={[{ fontSize: resolvedSize * 0.8 }, style]}>
                {CATEGORY_ICONS[categorySlug].emoji}
            </Text>
        );
    }

    return <View style={[{ width: resolvedSize, height: resolvedSize }, style]} />;
}

/**
 * Helper: Get category icon info
 */
export function getCategoryIconInfo(categorySlug) {
    return CATEGORY_ICONS[categorySlug] || { lucide: 'Store', phosphor: 'Storefront', color: '#6366f1', emoji: '🏪' };
}
