// ═══════════════════════════════════════════════════════════════════════
// Category Type Map — Classification of all 66 categories
// ═══════════════════════════════════════════════════════════════════════
// PRODUCT:     Sells physical goods (cart + checkout + delivery)
// APPOINTMENT: Sells time-based services (calendar + booking)
// HYBRID:      Sells both physical goods AND services
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_TYPE_MAP = {
  // ─── PRODUCT SHOPS (34 categories) ─────────────────────────────────
  KIRANA_GROCERY:           { type: 'PRODUCT',     displayName: 'Kirana & Grocery',              icon: '🛒', order: 1 },
  PHARMACY:                 { type: 'PRODUCT',     displayName: 'Pharmacy & Medical Store',       icon: '💊', order: 2 },
  BAKERY_SWEETS:            { type: 'PRODUCT',     displayName: 'Bakery & Sweets',                icon: '🍰', order: 3 },
  DAIRY_MILK_BOOTH:         { type: 'PRODUCT',     displayName: 'Dairy & Milk Booth',             icon: '🥛', order: 4 },
  MEAT_FISH_POULTRY:        { type: 'PRODUCT',     displayName: 'Meat, Fish & Poultry',           icon: '🥩', order: 5 },
  FRUIT_VEGETABLE:          { type: 'PRODUCT',     displayName: 'Fruits & Vegetables',            icon: '🥬', order: 6 },
  ELECTRONICS:              { type: 'PRODUCT',     displayName: 'Electronics & Gadgets',          icon: '📱', order: 7 },
  CLOTHING_FASHION:         { type: 'PRODUCT',     displayName: 'Clothing & Fashion',             icon: '👗', order: 8 },
  HARDWARE_PAINT:           { type: 'PRODUCT',     displayName: 'Hardware & Paint',               icon: '🔨', order: 9 },
  STATIONERY_BOOKSTORE:     { type: 'PRODUCT',     displayName: 'Stationery & Bookstore',         icon: '📚', order: 10 },
  FLORIST:                  { type: 'PRODUCT',     displayName: 'Florist',                        icon: '💐', order: 11 },
  JEWELLERY:                { type: 'PRODUCT',     displayName: 'Jewellery',                      icon: '💍', order: 12 },
  SPORTS_FITNESS:           { type: 'PRODUCT',     displayName: 'Sports & Fitness Equipment',     icon: '⚽', order: 13 },
  HOME_DECOR:               { type: 'PRODUCT',     displayName: 'Home Decor',                     icon: '🏠', order: 14 },
  GENERAL_RETAIL:           { type: 'PRODUCT',     displayName: 'General Retail',                 icon: '🏪', order: 15 },
  PET_STORE:                { type: 'PRODUCT',     displayName: 'Pet Store',                      icon: '🐾', order: 16 },
  COSMETICS_BEAUTY:         { type: 'PRODUCT',     displayName: 'Cosmetics & Beauty Products',    icon: '💄', order: 17 },
  FURNITURE:                { type: 'PRODUCT',     displayName: 'Furniture',                      icon: '🪑', order: 18 },
  MATTRESS_BEDDING:         { type: 'PRODUCT',     displayName: 'Mattress & Bedding',             icon: '🛏️', order: 19 },
  KITCHENWARE_UTENSILS:     { type: 'PRODUCT',     displayName: 'Kitchenware & Utensils',         icon: '🍳', order: 20 },
  ELECTRICAL_PLUMBING_SUPPLY: { type: 'PRODUCT',   displayName: 'Electrical & Plumbing Supply',   icon: '🔌', order: 21 },
  TYRE_BATTERY:             { type: 'PRODUCT',     displayName: 'Tyre & Battery',                 icon: '🔋', order: 22 },
  PAN_BETEL_SHOP:           { type: 'PRODUCT',     displayName: 'Pan & Betel Shop',               icon: '🍃', order: 23 },
  LIQUOR_WINE:              { type: 'PRODUCT',     displayName: 'Liquor & Wine Shop',             icon: '🍷', order: 24 },
  ICE_CREAM_DESSERT:        { type: 'PRODUCT',     displayName: 'Ice Cream & Dessert',            icon: '🍦', order: 25 },
  JUICE_SMOOTHIE_BAR:       { type: 'PRODUCT',     displayName: 'Juice & Smoothie Bar',           icon: '🥤', order: 26 },
  MOBILE_RECHARGE_DTH:      { type: 'PRODUCT',     displayName: 'Mobile Recharge & DTH',          icon: '📡', order: 27 },
  GIFT_NOVELTY:             { type: 'PRODUCT',     displayName: 'Gift & Novelty Shop',            icon: '🎁', order: 28 },
  TOY_STORE:                { type: 'PRODUCT',     displayName: 'Toy Store',                      icon: '🧸', order: 29 },
  NURSERY_GARDEN:           { type: 'PRODUCT',     displayName: 'Nursery & Garden Centre',        icon: '🌱', order: 30 },
  POOJA_RELIGIOUS:          { type: 'PRODUCT',     displayName: 'Pooja & Religious Items',        icon: '🪔', order: 31 },
  FUEL_STATION:             { type: 'PRODUCT',     displayName: 'Fuel Station / Petrol Pump',     icon: '⛽', order: 32 },
  FARM_AGRI_INPUT:          { type: 'PRODUCT',     displayName: 'Farm & Agri Input',              icon: '🌾', order: 33 },
  RECYCLING_SCRAP:          { type: 'PRODUCT',     displayName: 'Recycling & Scrap Dealer',       icon: '♻️', order: 34 },

  // ─── APPOINTMENT SHOPS (18 categories) ─────────────────────────────
  SALON_SPA:                { type: 'APPOINTMENT', displayName: 'Salon & Spa',                    icon: '💇', order: 35 },
  MEDICAL_CLINIC:           { type: 'APPOINTMENT', displayName: 'Medical Clinic',                 icon: '🏥', order: 36 },
  DENTAL_CLINIC:            { type: 'APPOINTMENT', displayName: 'Dental Clinic',                  icon: '🦷', order: 37 },
  PATHOLOGY_DIAGNOSTIC_LAB: { type: 'APPOINTMENT', displayName: 'Pathology & Diagnostic Lab',     icon: '🔬', order: 38 },
  PHYSIOTHERAPY_REHAB:      { type: 'APPOINTMENT', displayName: 'Physiotherapy & Rehab',          icon: '🦴', order: 39 },
  VETERINARY_CLINIC:        { type: 'APPOINTMENT', displayName: 'Veterinary Clinic',              icon: '🐕', order: 40 },
  COACHING_TUITION:         { type: 'APPOINTMENT', displayName: 'Coaching & Tuition Classes',     icon: '📖', order: 41 },
  PHOTOGRAPHY_STUDIO:       { type: 'APPOINTMENT', displayName: 'Photography Studio',             icon: '📸', order: 42 },
  CA_LEGAL_SERVICES:        { type: 'APPOINTMENT', displayName: 'CA & Legal Services',            icon: '⚖️', order: 43 },
  INSURANCE_FINANCIAL:      { type: 'APPOINTMENT', displayName: 'Insurance & Financial Advisor',  icon: '🏦', order: 44 },
  PEST_CONTROL:             { type: 'APPOINTMENT', displayName: 'Pest Control Services',          icon: '🐛', order: 45 },
  PACKERS_MOVERS:           { type: 'APPOINTMENT', displayName: 'Packers & Movers',               icon: '📦', order: 46 },
  TRAVEL_AGENT:             { type: 'APPOINTMENT', displayName: 'Travel Agent',                   icon: '✈️', order: 47 },
  LAUNDRY_DRYCLEAN:         { type: 'APPOINTMENT', displayName: 'Laundry & Dry Clean',            icon: '👔', order: 48 },
  COBBLER_SHOE_REPAIR:      { type: 'APPOINTMENT', displayName: 'Cobbler & Shoe Repair',          icon: '👞', order: 49 },
  KEY_LOCKSMITH:            { type: 'APPOINTMENT', displayName: 'Key & Locksmith',                icon: '🔑', order: 50 },
  EVENT_WEDDING_PLANNER:    { type: 'APPOINTMENT', displayName: 'Event & Wedding Planner',        icon: '🎉', order: 51 },
  COURIER_LOGISTICS:        { type: 'APPOINTMENT', displayName: 'Courier & Logistics',            icon: '🚚', order: 52 },

  // ─── HYBRID SHOPS (14 categories) ──────────────────────────────────
  RESTAURANT:               { type: 'HYBRID',      displayName: 'Restaurant & Food',              icon: '🍽️', order: 53 },
  TIFFIN_CATERING:          { type: 'HYBRID',      displayName: 'Tiffin & Catering Service',      icon: '🍱', order: 54 },
  TEA_COFFEE_CAFE:          { type: 'HYBRID',      displayName: 'Tea, Coffee & Cafe',             icon: '☕', order: 55 },
  OPTICAL:                  { type: 'HYBRID',      displayName: 'Optical & Eye Care',             icon: '👓', order: 56 },
  GARAGE_AUTO:              { type: 'HYBRID',      displayName: 'Garage & Auto Service',          icon: '🔧', order: 57 },
  COMPUTER_MOBILE_REPAIR:   { type: 'HYBRID',      displayName: 'Computer & Mobile Repair',       icon: '💻', order: 58 },
  AC_APPLIANCE_REPAIR:      { type: 'HYBRID',      displayName: 'AC & Appliance Repair',          icon: '❄️', order: 59 },
  WATER_PURIFIER_RO:        { type: 'HYBRID',      displayName: 'Water Purifier & RO Service',    icon: '💧', order: 60 },
  CAR_BIKE_DEALER:          { type: 'HYBRID',      displayName: 'Car & Bike Dealer',              icon: '🚗', order: 61 },
  GYM_YOGA_STUDIO:          { type: 'HYBRID',      displayName: 'Gym & Yoga Studio',              icon: '🧘', order: 62 },
  AYURVEDA_HOMEOPATHY:      { type: 'HYBRID',      displayName: 'Ayurveda & Homeopathy',          icon: '🌿', order: 63 },
  INTERIOR_DESIGNER:        { type: 'HYBRID',      displayName: 'Interior Designer',              icon: '🎨', order: 64 },
  PRINTING_XEROX:           { type: 'HYBRID',      displayName: 'Printing & Xerox',               icon: '🖨️', order: 65 },
  TAILORING_ALTERATION:     { type: 'HYBRID',      displayName: 'Tailoring & Alteration',         icon: '🧵', order: 66 },
};

/**
 * Get the category type for a given category slug
 */
function getCategoryType(slug) {
  const entry = CATEGORY_TYPE_MAP[slug];
  return entry ? entry.type : 'PRODUCT'; // Default to PRODUCT if unknown
}

/**
 * Get all categories as an array for seeding
 */
function getAllCategories() {
  return Object.entries(CATEGORY_TYPE_MAP).map(([slug, data]) => ({
    slug,
    name: data.displayName,
    categoryType: data.type,
    iconUrl: data.icon,
    displayOrder: data.order,
  }));
}

/**
 * Get categories filtered by type
 */
function getCategoriesByType(type) {
  return Object.entries(CATEGORY_TYPE_MAP)
    .filter(([, data]) => data.type === type)
    .map(([slug, data]) => ({
      slug,
      name: data.displayName,
      categoryType: data.type,
      iconUrl: data.icon,
      displayOrder: data.order,
    }));
}

module.exports = {
  CATEGORY_TYPE_MAP,
  getCategoryType,
  getAllCategories,
  getCategoriesByType,
};
