// ═══════════════════════════════════════════════════════════════════════
// Category Type Map — the live taxonomy, typed by commerce model
// ═══════════════════════════════════════════════════════════════════════
// PRODUCT:     Sells physical goods (cart + checkout + delivery)
// APPOINTMENT: Sells time-based services (calendar + booking)
// HYBRID:      Sells both physical goods AND services
// ═══════════════════════════════════════════════════════════════════════
//
// ─── Why this file was rewritten ──────────────────────────────────────
//
// It used to declare 66 categories of its own, keyed SCREAMING_SNAKE:
// KIRANA_GROCERY, PHARMACY, SALON_SPA. The platform routes on
// shop_categories.slug, which is kebab-case — grocery-supermarkets,
// pharmacy-healthcare, salon-beauty-spa — and all five routing maps agree
// with it.
//
// Not one of the 66 keys appeared in any routing map, and prisma/seed.js
// writes them straight into categories.slug. A shop seeded through the
// Prisma path therefore rendered the generic RetailVisitorView: a clinic,
// a salon and a garage all looked like a grocery counter. That is exactly
// the failure an earlier migration removed from the kebab/snake-case
// switch, reachable again through the seeder, and nothing failed loudly
// enough to notice — the fallback is silent by design.
//
// ─── How the types below were decided ─────────────────────────────────
//
// Not by re-guessing each category. The backend's ARCHETYPE_MAP already
// classifies every live slug into an archetype — retail, healthcare,
// garage_repair, home_visit — and the archetype already encodes whether a
// category sells goods, time, or both. The commerce type is derived from
// it by the table below, so the two cannot drift: adding a category to
// ARCHETYPE_MAP and forgetting it here is caught by
// categoryTypeMapParity.test.js rather than by a shop rendering wrong.
//
//   retail, pharmacy, fresh_perishable,
//   subscription, eyewear                   -> PRODUCT
//   healthcare, salon_wellness, education,
//   professional, home_visit, laundry,
//   event_creative                          -> APPOINTMENT
//   restaurant, tiffin, garage_repair,
//   tailoring, print_counter                -> HYBRID
//
// The HYBRID cases are the ones worth stating plainly: a garage sells
// parts and labour, a tailor sells cloth and fitting, a print counter
// sells paper and a job. Each needs both a catalogue and a calendar.

/**
 * Archetype → commerce model.
 *
 * The single place the derivation lives. ARCHETYPE_MAP in
 * modules/ecommerce/controllers/shop-management.controller.js is the source
 * of the archetypes themselves.
 */
const ARCHETYPE_TO_TYPE = Object.freeze({
  retail: 'PRODUCT',
  pharmacy: 'PRODUCT',
  fresh_perishable: 'PRODUCT',
  subscription: 'PRODUCT',
  eyewear: 'PRODUCT',

  healthcare: 'APPOINTMENT',
  salon_wellness: 'APPOINTMENT',
  education: 'APPOINTMENT',
  professional: 'APPOINTMENT',
  home_visit: 'APPOINTMENT',
  laundry: 'APPOINTMENT',
  event_creative: 'APPOINTMENT',

  restaurant: 'HYBRID',
  tiffin: 'HYBRID',
  garage_repair: 'HYBRID',
  tailoring: 'HYBRID',
  print_counter: 'HYBRID',
});

/**
 * The live categories, keyed by the slug the platform actually routes on.
 *
 * `archetype` is the key into ARCHETYPE_TO_TYPE above; `type` is derived
 * rather than written out, so a category cannot be typed one way here and
 * routed another way in the app.
 *
 * Display names match shop_categories.name so a Prisma-seeded catalogue and
 * a SQL-seeded one read identically.
 */
const CATEGORY_MAP = {
  // ─── Retail counters ────────────────────────────────────────────────
  'grocery-supermarkets':        { archetype: 'retail', fixtureKey: 'KIRANA_GROCERY',           displayName: 'Grocery & Supermarket',        icon: '🛒', order: 1 },
  'dairy-sweets-bakery':         { archetype: 'retail', fixtureKey: 'BAKERY_SWEETS',           displayName: 'Dairy, Sweets & Bakery',       icon: '🍰', order: 2 },
  'fresh-produce-meat':          { archetype: 'pharmacy', fixtureKey: 'MEAT_FISH_POULTRY',         displayName: 'Fresh Produce & Meat',         icon: '🥬', order: 3 },
  'pharmacy-healthcare':         { archetype: 'pharmacy', fixtureKey: 'PHARMACY',         displayName: 'Pharmacy & Healthcare',        icon: '💊', order: 4 },
  'stationery-gifts-books':      { archetype: 'retail', fixtureKey: 'STATIONERY_BOOKSTORE',           displayName: 'Stationery, Gifts & Books',    icon: '📚', order: 5 },
  'pet-care-supplies':           { archetype: 'retail', fixtureKey: 'PET_STORE',           displayName: 'Pet Care & Supplies',          icon: '🐾', order: 6 },
  'pooja-samagri-religious':     { archetype: 'retail', fixtureKey: 'POOJA_RELIGIOUS',           displayName: 'Pooja Samagri & Religious',    icon: '🪔', order: 7 },
  'hardware-sanitary':           { archetype: 'retail', fixtureKey: 'HARDWARE_PAINT',           displayName: 'Hardware & Sanitary',          icon: '🔨', order: 8 },
  'clothing-fashion':            { archetype: 'retail', fixtureKey: 'CLOTHING_FASHION',           displayName: 'Clothing & Fashion',           icon: '👗', order: 9 },
  'jewellery-gold':              { archetype: 'retail', fixtureKey: 'JEWELLERY',           displayName: 'Jewellery & Gold',             icon: '💍', order: 10 },
  'florists-nurseries':          { archetype: 'fresh_perishable', fixtureKey: 'FLORIST', displayName: 'Florists & Nurseries',         icon: '💐', order: 11 },
  'eyewear-opticians':           { archetype: 'eyewear', fixtureKey: 'OPTICAL',          displayName: 'Eyewear & Opticians',          icon: '👓', order: 12 },
  'water-tanker-supply':         { archetype: 'subscription',     displayName: 'Water Tanker Supply',          icon: '🚰', order: 13 },
  'gas-cylinder-lpg':            { archetype: 'subscription',     displayName: 'Gas Cylinder & LPG',           icon: '🛢️', order: 14 },

  // ─── Food ───────────────────────────────────────────────────────────
  'restaurants-cafes':           { archetype: 'restaurant', fixtureKey: 'RESTAURANT',       displayName: 'Restaurants & Cafes',          icon: '🍽️', order: 20 },
  'tiffin-meal-subscription':    { archetype: 'tiffin', fixtureKey: 'TIFFIN_CATERING',           displayName: 'Tiffin & Meal Subscription',   icon: '🍱', order: 21 },

  // ─── Repair and fitting ─────────────────────────────────────────────
  'automotive-mechanic':         { archetype: 'garage_repair', fixtureKey: 'GARAGE_AUTO',    displayName: 'Automotive & Mechanic',        icon: '🔧', order: 30 },
  'ac-appliance-repair':         { archetype: 'garage_repair', fixtureKey: 'AC_APPLIANCE_REPAIR',    displayName: 'AC & Appliance Repair',        icon: '❄️', order: 31 },
  'mobile-computer-repair':      { archetype: 'garage_repair', fixtureKey: 'COMPUTER_MOBILE_REPAIR',    displayName: 'Mobile & Computer Repair',     icon: '📱', order: 32 },
  'electricians-electronics':    { archetype: 'garage_repair', fixtureKey: 'ELECTRICAL_PLUMBING_SUPPLY',    displayName: 'Electricians & Electronics',   icon: '🔌', order: 33 },
  'ro-water-purifier':           { archetype: 'garage_repair', fixtureKey: 'WATER_PURIFIER_RO',    displayName: 'RO & Water Purifier',          icon: '💧', order: 34 },
  'tailoring-boutiques':         { archetype: 'tailoring', fixtureKey: 'TAILORING_ALTERATION',        displayName: 'Tailoring & Boutiques',        icon: '✂️', order: 35 },
  'printing-xerox-dtp':          { archetype: 'print_counter', fixtureKey: 'PRINTING_XEROX',    displayName: 'Printing, Xerox & DTP',        icon: '🖨️', order: 36 },
  'courier-parcel-services':     { archetype: 'print_counter', fixtureKey: 'COURIER_LOGISTICS',    displayName: 'Courier & Parcel Services',    icon: '📦', order: 37 },

  // ─── Health ─────────────────────────────────────────────────────────
  'dentists-orthodontists':      { archetype: 'healthcare', fixtureKey: 'DENTAL_CLINIC',       displayName: 'Dentists & Orthodontists',     icon: '🦷', order: 40 },
  'pathology-labs':              { archetype: 'healthcare', fixtureKey: 'PATHOLOGY_DIAGNOSTIC_LAB',       displayName: 'Pathology Labs',               icon: '🧪', order: 41 },
  'physiotherapy':               { archetype: 'healthcare', fixtureKey: 'PHYSIOTHERAPY_REHAB',       displayName: 'Physiotherapy',                icon: '🧑‍⚕️', order: 42 },
  'ayurvedic-homeopathic':       { archetype: 'healthcare', fixtureKey: 'AYURVEDA_HOMEOPATHY',       displayName: 'Ayurvedic & Homeopathic',      icon: '🌿', order: 43 },
  'dieticians-nutritionists':    { archetype: 'healthcare', fixtureKey: 'MEDICAL_CLINIC',       displayName: 'Dieticians & Nutritionists',   icon: '🥗', order: 44 },

  // ─── Personal care ──────────────────────────────────────────────────
  'salon-beauty-spa':            { archetype: 'salon_wellness', fixtureKey: 'SALON_SPA',   displayName: 'Salon, Beauty & Spa',          icon: '💇', order: 50 },
  'gym-fitness':                 { archetype: 'salon_wellness', fixtureKey: 'GYM_YOGA_STUDIO',   displayName: 'Gym & Fitness',                icon: '🏋️', order: 51 },
  'yoga-wellness':               { archetype: 'salon_wellness', fixtureKey: 'GYM_YOGA_STUDIO',   displayName: 'Yoga & Wellness',              icon: '🧘', order: 52 },
  'car-bike-wash':               { archetype: 'salon_wellness', fixtureKey: 'CAR_BIKE_DEALER',   displayName: 'Car & Bike Wash',              icon: '🚿', order: 53 },
  'laundry-dry-cleaning':        { archetype: 'laundry', fixtureKey: 'LAUNDRY_DRYCLEAN',          displayName: 'Laundry & Dry Cleaning',       icon: '🧺', order: 54 },

  // ─── At your door ───────────────────────────────────────────────────
  'home-services-plumbers':      { archetype: 'home_visit',       displayName: 'Plumber & Home Services',      icon: '🚰', order: 60 },
  'pest-control':                { archetype: 'home_visit', fixtureKey: 'PEST_CONTROL',       displayName: 'Pest Control',                 icon: '🐜', order: 61 },
  'deep-cleaning':               { archetype: 'home_visit',       displayName: 'Deep Cleaning',                icon: '🧹', order: 62 },
  'locksmith-key-maker':         { archetype: 'home_visit', fixtureKey: 'KEY_LOCKSMITH',       displayName: 'Locksmith & Key Maker',        icon: '🔑', order: 63 },
  'packers-movers':              { archetype: 'home_visit', fixtureKey: 'PACKERS_MOVERS',       displayName: 'Packers & Movers',             icon: '🚚', order: 64 },
  'painting-renovation':         { archetype: 'home_visit',       displayName: 'Painting & Renovation',        icon: '🎨', order: 65 },
  'security-cctv':               { archetype: 'home_visit',       displayName: 'Security & CCTV',              icon: '📹', order: 66 },

  // ─── Learning ───────────────────────────────────────────────────────
  'tutors-education':            { archetype: 'education', fixtureKey: 'COACHING_TUITION',        displayName: 'Tutors & Education',           icon: '📖', order: 70 },
  'coaching-test-prep':          { archetype: 'education', fixtureKey: 'COACHING_TUITION',        displayName: 'Coaching & Test Prep',         icon: '🎓', order: 71 },
  'driving-schools':             { archetype: 'education',        displayName: 'Driving Schools',              icon: '🚗', order: 72 },

  // ─── Advisers ───────────────────────────────────────────────────────
  'cas-tax-consultants':         { archetype: 'professional', fixtureKey: 'CA_LEGAL_SERVICES',     displayName: 'CAs & Tax Consultants',        icon: '📊', order: 80 },
  'lawyers-advocates':           { archetype: 'professional', fixtureKey: 'CA_LEGAL_SERVICES',     displayName: 'Lawyers & Advocates',          icon: '⚖️', order: 81 },
  'insurance-agents':            { archetype: 'professional', fixtureKey: 'INSURANCE_FINANCIAL',     displayName: 'Insurance Agents',             icon: '🛡️', order: 82 },
  'real-estate-brokers':         { archetype: 'professional',     displayName: 'Real Estate Brokers',          icon: '🏘️', order: 83 },
  'travel-agents-visa':          { archetype: 'professional', fixtureKey: 'TRAVEL_AGENT',     displayName: 'Travel Agents & Visa',         icon: '✈️', order: 84 },

  // ─── Occasions ──────────────────────────────────────────────────────
  'catering-party':              { archetype: 'event_creative', fixtureKey: 'TIFFIN_CATERING',   displayName: 'Catering & Party',             icon: '🎉', order: 90 },
  'event-planners-decorators':   { archetype: 'event_creative', fixtureKey: 'EVENT_WEDDING_PLANNER',   displayName: 'Event Planners & Decorators',  icon: '🎪', order: 91 },
  'wedding-party-planner':       { archetype: 'event_creative', fixtureKey: 'EVENT_WEDDING_PLANNER',   displayName: 'Wedding & Party Planner',      icon: '💒', order: 92 },
  'photographers-videographers': { archetype: 'event_creative', fixtureKey: 'PHOTOGRAPHY_STUDIO',   displayName: 'Photographers & Videographers',icon: '📷', order: 93 },
  'interior-design-decor':       { archetype: 'event_creative', fixtureKey: 'INTERIOR_DESIGNER',   displayName: 'Interior Design & Decor',      icon: '🛋️', order: 94 },
  'astrologer-pandit':           { archetype: 'event_creative',   displayName: 'Astrologer & Pandit',          icon: '🔮', order: 95 },
  'turf-grounds':                { archetype: 'event_creative',   displayName: 'Turf & Grounds',               icon: '🏟️', order: 96 },
};

/**
 * The legacy key a category's fixture content is filed under.
 *
 * product-generator.js and slot-generator.js were written against the old
 * SCREAMING_SNAKE taxonomy and index their catalogues by it. Renaming the
 * slugs to the live kebab-case ones would have made every lookup miss — and
 * both generators fall back silently, so the seeder would have produced shops
 * with no products and no bookable slots and reported success.
 *
 * Rather than rewrite two large fixture files, the category carries the key
 * its sample content lives under. Categories with no counterpart return null
 * and simply seed without demo inventory, which is honest: there is no
 * catalogue for them to borrow.
 */
function getFixtureKey(slug) {
  const entry = CATEGORY_MAP[slug];
  return (entry && entry.fixtureKey) || null;
}

/** The commerce model for a slug, derived from its archetype. */
function getCategoryType(slug) {
  const entry = CATEGORY_MAP[slug];
  if (!entry) return null;
  return ARCHETYPE_TO_TYPE[entry.archetype] || null;
}

/**
 * Every category, in the shape prisma/seed.js writes.
 *
 * `slug` is the live kebab-case key, so a Prisma-seeded shop resolves to its
 * specialised view instead of falling through to the generic one.
 */
function getAllCategories() {
  return Object.entries(CATEGORY_MAP).map(([slug, data]) => ({
    slug,
    name: data.displayName,
    categoryType: ARCHETYPE_TO_TYPE[data.archetype],
    archetype: data.archetype,
    fixtureKey: data.fixtureKey || null,
    iconUrl: data.icon,
    displayOrder: data.order,
  }));
}

/** Categories filtered by commerce model: PRODUCT, APPOINTMENT or HYBRID. */
function getCategoriesByType(type) {
  return getAllCategories().filter((c) => c.categoryType === type);
}

module.exports = {
  CATEGORY_MAP,
  ARCHETYPE_TO_TYPE,
  getCategoryType,
  getFixtureKey,
  getAllCategories,
  getCategoriesByType,
};
