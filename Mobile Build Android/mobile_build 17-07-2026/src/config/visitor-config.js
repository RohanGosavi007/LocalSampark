export const VISITOR_VIEW_MAP = {
  'retail': 'RetailVisitorView',
  'grocery': 'RetailVisitorView',
  'pharmacy': 'PharmacyVisitorView',
  'restaurant': 'RestaurantVisitorView',
  'tiffin': 'TiffinCateringVisitorView',
  'beauty-salon': 'BeautyVisitorView',
  'doctors': 'DoctorVisitorView',
  'education': 'EducationEventsVisitorView',
  'home-services': 'HomeServiceVisitorView',
  'professionals': 'ProfessionalVisitorView',
  'hospital': 'HospitalVisitorView',
  'fleet': 'FleetVisitorView',
  'garage': 'GarageVisitorView',
  'two-wheeler': 'TwoWheelerVisitorView',
  'four-wheeler': 'FourWheelerVisitorView',
};

export const getVisitorView = (categorySlug) => {
  return VISITOR_VIEW_MAP[categorySlug] || 'RetailVisitorView';
};
