export const CATEGORY_MANAGER_MAP = {
  'retail': 'RetailManager',
  'grocery': 'RetailManager',
  'hospitals-clinics': 'HospitalManager',
  'beauty-salon': 'BeautyManager',
  'doctors': 'DoctorManager',
  'education': 'EducationEventsManager',
  'home-services': 'HomeServiceManager',
  'professionals': 'ProfessionalManager',
  'fleet': 'FleetManager',
  '2-wheeler-garage': 'TwoWheelerManager',
  '4-wheeler-garage': 'FourWheelerManager',
  'pharmacy': 'PharmacyManager',
  'restaurant': 'RestaurantManager',
  'tiffin': 'TiffinCateringManager',
};

export const getManagerRoute = (categorySlug) => {
  const managerComponent = CATEGORY_MANAGER_MAP[categorySlug];
  if (managerComponent) {
    return `/modules/managers/${managerComponent}`;
  }
  return null; // Fallback to generic shop dashboard
};
