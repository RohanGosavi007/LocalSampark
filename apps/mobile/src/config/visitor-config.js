/**
 * Category → visitor view for the shop-detail tree under app/modules/shop-detail.
 *
 * This is the map the Directory tab uses: app/(tabs)/directory.js pushes
 * /modules/shop-detail?id=…&category=<slug>, and app/modules/shop-detail/index.js
 * resolves the view through getVisitorView below.
 *
 * It previously held fifteen keys from the retired taxonomy — 'retail',
 * 'grocery', 'pharmacy', 'restaurant', 'beauty-salon' — while shop_categories
 * has used kebab-case slugs like 'grocery-supermarkets' and
 * 'pharmacy-healthcare' for some time. Not one of the fifteen matched a real
 * category, and getVisitorView falls back to RetailVisitorView on a miss, so
 * every shop opened from the Directory tab rendered the generic retail view: a
 * clinic, a salon, a garage and a tuition centre all looked like a grocery
 * counter. Nothing failed and nothing logged.
 *
 * This is the third copy of that same defect found in this codebase — the web
 * visitor router and apps/mobile/src/components/shops/VisitorViewRouter.js both
 * had it. The keys below are the 62 slugs in shop_categories, and
 * backend/src/__tests__/categoryRouterParity.test.js now holds this file in step
 * with the other four maps so a category can no longer be added to one and
 * forgotten in the rest.
 *
 * Three views in this tree — FleetVisitorView, TwoWheelerVisitorView and
 * FourWheelerVisitorView — have no category pointing at them, because vehicle
 * rental and dealership categories do not exist in shop_categories. They are
 * left unmapped rather than pointed at an approximate slug; adding the category
 * is what should make them reachable.
 */
export const VISITOR_VIEW_MAP = {
  // ─── Food & daily needs ───────────────────────────────────────────────
  'grocery-supermarkets': 'RetailVisitorView',
  'fresh-produce-meat': 'RetailVisitorView',
  'dairy-sweets-bakery': 'RetailVisitorView',
  'restaurants-cafes': 'RestaurantVisitorView',
  'tiffin-meal-subscription': 'TiffinCateringVisitorView',
  'catering-party': 'TiffinCateringVisitorView',
  'catering-party-services': 'TiffinCateringVisitorView',

  // ─── Health ───────────────────────────────────────────────────────────
  'pharmacy-healthcare': 'PharmacyVisitorView',
  'dentists-orthodontists': 'DoctorVisitorView',
  'ayurvedic-homeopathic': 'DoctorVisitorView',
  'dieticians-nutritionists': 'DoctorVisitorView',
  'physiotherapy': 'DoctorVisitorView',
  'physiotherapy-chiropractic': 'DoctorVisitorView',
  'pathology-labs': 'HospitalVisitorView',
  'pathology-labs-diagnostics': 'HospitalVisitorView',

  // ─── Wellness & grooming ──────────────────────────────────────────────
  'salon-beauty-spa': 'BeautyVisitorView',
  'yoga-wellness': 'BeautyVisitorView',
  'gym-fitness': 'BeautyVisitorView',

  // ─── Repair & vehicle service ─────────────────────────────────────────
  'automotive-mechanic': 'GarageVisitorView',
  'mobile-computer-repair': 'GarageVisitorView',
  'ac-appliance-repair': 'GarageVisitorView',
  'ro-water-purifier': 'GarageVisitorView',
  'ro-water-purifier-service': 'GarageVisitorView',
  'car-bike-wash': 'GarageVisitorView',

  // ─── At-home services ─────────────────────────────────────────────────
  'home-services-plumbers': 'HomeServiceVisitorView',
  'electricians-electronics': 'HomeServiceVisitorView',
  'pest-control': 'HomeServiceVisitorView',
  'pest-control-services': 'HomeServiceVisitorView',
  'deep-cleaning': 'HomeServiceVisitorView',
  'deep-cleaning-services': 'HomeServiceVisitorView',
  'painting-renovation': 'HomeServiceVisitorView',
  'security-cctv': 'HomeServiceVisitorView',
  'locksmith-key-maker': 'HomeServiceVisitorView',
  'laundry-dry-cleaning': 'HomeServiceVisitorView',
  'packers-movers': 'HomeServiceVisitorView',
  'courier-parcel-services': 'HomeServiceVisitorView',
  'gas-cylinder-lpg': 'HomeServiceVisitorView',
  'water-tanker-supply': 'HomeServiceVisitorView',

  // ─── Advisory & professional ──────────────────────────────────────────
  'cas-tax-consultants': 'ProfessionalVisitorView',
  'lawyers-advocates': 'ProfessionalVisitorView',
  'insurance-agents': 'ProfessionalVisitorView',
  'travel-agents-visa': 'ProfessionalVisitorView',
  'interior-design-decor': 'ProfessionalVisitorView',
  'astrologer-pandit': 'ProfessionalVisitorView',
  'real-estate-brokers': 'ProfessionalVisitorView',

  // ─── Learning & events ────────────────────────────────────────────────
  'tutors-education': 'EducationEventsVisitorView',
  'coaching-test-prep': 'EducationEventsVisitorView',
  'driving-schools': 'EducationEventsVisitorView',
  'event-planners-decorators': 'EducationEventsVisitorView',
  'wedding-party-planner': 'EducationEventsVisitorView',
  'photographers-videographers': 'EducationEventsVisitorView',
  'turf-grounds': 'EducationEventsVisitorView',

  // ─── Storefront retail ────────────────────────────────────────────────
  'clothing-fashion': 'RetailVisitorView',
  'jewellery-gold': 'RetailVisitorView',
  'stationery-gifts-books': 'RetailVisitorView',
  'pooja-samagri-religious': 'RetailVisitorView',
  'hardware-sanitary': 'RetailVisitorView',
  'pet-care-supplies': 'RetailVisitorView',
  'florists-nurseries': 'RetailVisitorView',
  'eyewear-opticians': 'RetailVisitorView',
  'printing-xerox-dtp': 'RetailVisitorView',
  'tailoring-boutiques': 'RetailVisitorView',
};

export const getVisitorView = (categorySlug) => {
  const view = VISITOR_VIEW_MAP[categorySlug];
  if (!view && categorySlug && __DEV__) {
    // The silent fallback is what let the whole map rot unnoticed. A category
    // that reaches here renders the retail view, which is a reasonable default
    // but is very rarely the right answer.
    console.warn(
      `[visitor-config] No view mapped for category "${categorySlug}" — falling back to RetailVisitorView.`
    );
  }
  return view || 'RetailVisitorView';
};
