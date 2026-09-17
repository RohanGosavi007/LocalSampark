// Icon name mapping for @expo/vector-icons (Ionicons)
// Replaces emoji icons with proper vector icons across all mobile modules

export const SERVICE_ICONS = {
  laundry: { name: 'water-outline', color: '#6366f1' },
  logistics: { name: 'car-outline', color: '#f97316' },
  maid: { name: 'brush-outline', color: '#8b5cf6' },
  carwash: { name: 'car-sport-outline', color: '#0ea5e9' },
  parcel: { name: 'cube-outline', color: '#f59e0b' },
  water: { name: 'water-outline', color: '#06b6d4' },
  wfh: { name: 'laptop-outline', color: '#8b5cf6' },
  catering: { name: 'restaurant-outline', color: '#f97316' },
  scrap: { name: 'trash-outline', color: '#10b981' },
  gardening: { name: 'leaf-outline', color: '#22c55e' },
  locksmith: { name: 'key-outline', color: '#f59e0b' },
  docs: { name: 'document-text-outline', color: '#6366f1' },
  bloodtest: { name: 'medical-outline', color: '#ef4444' },
  medicines: { name: 'medkit-outline', color: '#3b82f6' },
  physio: { name: 'fitness-outline', color: '#10b981' },
  nurse: { name: 'bandage-outline', color: '#ef4444' },
  deepclean: { name: 'home-outline', color: '#6366f1' },
  sofaspa: { name: 'bed-outline', color: '#a855f7' },
  cctvtech: { name: 'videocam-outline', color: '#3b82f6' },
  homesalon: { name: 'cut-outline', color: '#ec4899' },
  tyreassist: { name: 'build-outline', color: '#f97316' },
  fumigation: { name: 'shield-checkmark-outline', color: '#10b981' },
  petgrooming: { name: 'paw-outline', color: '#f59e0b' },
  partyplanner: { name: 'balloon-outline', color: '#ec4899' },
  evcharging: { name: 'flash-outline', color: '#22c55e' },
  coworking: { name: 'business-outline', color: '#6366f1' },
  passport: { name: 'reader-outline', color: '#3b82f6' },
  default: { name: 'ellipse-outline', color: '#6366f1' },
};

export const CATEGORY_ICONS = {
  'Home Care': { name: 'home-outline', color: '#6366f1' },
  'Health': { name: 'medical-outline', color: '#ef4444' },
  'Logistics': { name: 'car-outline', color: '#f97316' },
  'Tech': { name: 'laptop-outline', color: '#3b82f6' },
  'Community': { name: 'people-outline', color: '#10b981' },
  'Government': { name: 'flag-outline', color: '#8b5cf6' },
  'Events': { name: 'calendar-outline', color: '#ec4899' },
};

export const FEED_ICONS = {
  alert: { name: 'warning-outline', color: '#ef4444' },
  deal: { name: 'pricetag-outline', color: '#10b981' },
  event: { name: 'calendar-outline', color: '#f97316' },
  carpool: { name: 'car-outline', color: '#3b82f6' },
  lost: { name: 'search-outline', color: '#f59e0b' },
};

export const NAV_ICONS = {
  home: 'home-outline',
  shops: 'storefront-outline',
  services: 'construct-outline',
  community: 'people-outline',
  carpool: 'car-outline',
  events: 'calendar-outline',
  wallet: 'wallet-outline',
  profile: 'person-outline',
  settings: 'settings-outline',
  notifications: 'notifications-outline',
};

// Helper to get icon config
export function getServiceIcon(serviceId) {
  return SERVICE_ICONS[serviceId] || SERVICE_ICONS.default;
}
