const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════
// INTELLIGENT MOCK DATA GENERATOR
// Automatically serves tailored products, services, and staff for 60+ categories
// ═══════════════════════════════════════════════════════════════════════

const generateId = (prefix) => `${prefix}_${crypto.randomUUID().split('-')[0]}`;
const randPrice = (min, max) => Math.floor(Math.random() * (max - min) + min);

const CATEGORY_MAPPINGS = {
  // MEDICAL & HEALTH
  pharmacy: {
    products: ['Paracetamol 500mg', 'Cough Syrup', 'Vitamin C Tablets', 'First Aid Kit', 'Digital Thermometer', 'BP Monitor', 'Whey Protein', 'Pain Relief Spray'],
    services: [], staff: []
  },
  doctor: {
    products: [],
    services: ['General Consultation', 'Specialist Consultation', 'Follow-up Visit', 'Video Consultation', 'Health Checkup'],
    staff: ['Dr. Ramesh (General)', 'Dr. Priya (Cardiologist)', 'Dr. Sharma (Pediatrician)', 'Dr. Gupta (Orthopedic)']
  },
  hospital: {
    products: ['Surgical Mask', 'Sanitizer 500ml'],
    services: ['OPD Consultation', 'Emergency Care', 'Pathology Lab Test', 'X-Ray / MRI', 'Dental Checkup'],
    staff: ['Dr. Surgeon', 'Head Nurse Priya', 'Dr. Pathologist', 'Emergency Response Team']
  },
  
  // BEAUTY & WELLNESS
  salon: {
    products: ['Hair Serum', 'Shampoo 500ml', 'Face Scrub', 'Hair Wax'],
    services: ['Men Haircut', 'Women Haircut', 'Hair Spa', 'Facial', 'Beard Styling', 'Manicure', 'Pedicure'],
    staff: ['Rajesh (Senior Stylist)', 'Pooja (Beauty Therapist)', 'Rahul (Barber)', 'Simran (Colorist)']
  },
  beauty: {
    products: ['Foundation Cream', 'Lipstick Set', 'Eyeliner', 'Perfume'],
    services: ['Bridal Makeup', 'Party Makeup', 'Advanced Facial', 'Skin Treatment'],
    staff: ['Neha (Makeup Artist)', 'Anjali (Skin Expert)']
  },

  // FOOD & DINING
  restaurant: {
    products: ['Paneer Butter Masala', 'Butter Chicken', 'Veg Biryani', 'Chicken Tikka', 'Tandoori Roti', 'Garlic Naan', 'Dal Makhani', 'Gulab Jamun'],
    services: ['Table Reservation', 'Party Hall Booking'],
    staff: ['Chef Sanjeev', 'Manoj (Captain)']
  },
  cafe: {
    products: ['Cappuccino', 'Cold Coffee', 'Mocha', 'Veg Sandwich', 'Cheese Fries', 'Brownie', 'Pasta Alfredo'],
    services: ['Table Reservation'],
    staff: ['Barista Karan', 'Server Priya']
  },
  tiffin: {
    products: ['Mini Veg Thali', 'Premium Non-Veg Thali', 'Diet Meal Box', 'Monthly Subscription (Veg)'],
    services: [], staff: []
  },

  // AUTO & REPAIRS
  garage: {
    products: ['Engine Oil 1L', 'Brake Fluid', 'Microfiber Cloth', 'Wiper Blades', 'Car Polish'],
    services: ['General Servicing', 'Oil Change', 'Wheel Alignment', 'Car Wash & Polish', 'Denting & Painting', 'AC Repair'],
    staff: ['Raju (Senior Mechanic)', 'Imran (Denting Expert)', 'Vinod (Electrician)']
  },
  
  // RETAIL & SHOPPING
  retail: {
    products: ['Cotton T-Shirt', 'Denim Jeans', 'Running Shoes', 'Backpack', 'Sunglasses', 'Wrist Watch', 'Jacket'],
    services: [], staff: []
  },
  electronics: {
    products: ['Smartphone', 'Wireless Earbuds', 'Smartwatch', 'Power Bank 10000mAh', 'USB-C Cable', 'Bluetooth Speaker'],
    services: ['Device Repair', 'Screen Replacement'],
    staff: ['Tech Guru', 'Repair Specialist']
  },
  grocery: {
    products: ['Aashirvaad Atta 5kg', 'Toor Dal 1kg', 'Basmati Rice 5kg', 'Sunflower Oil 1L', 'Sugar 1kg', 'Tea Powder 500g', 'Salt 1kg', 'Biscuits Pack'],
    services: [], staff: []
  },
  pet: {
    products: ['Dog Food 3kg', 'Cat Litter 5kg', 'Pet Shampoo', 'Chew Toy', 'Bird Seed 1kg'],
    services: ['Pet Grooming', 'Vet Consultation'],
    staff: ['Dr. Meow (Vet)', 'Tommy (Groomer)']
  },

  // PROFESSIONAL SERVICES
  professional: {
    products: [],
    services: ['Tax Consultation (CA)', 'Legal Advice (Lawyer)', 'Business Registration', 'Visa Processing'],
    staff: ['Advocate Sharma', 'CA Rajesh', 'Consultant Priya']
  },

  // HOME SERVICES
  home_service: {
    products: ['LED Bulb', 'Switch Board', 'Tap Fitting', 'Pipe Joint'],
    services: ['AC Servicing', 'Plumbing Repair', 'Electrical Wiring', 'Pest Control', 'Home Deep Cleaning'],
    staff: ['Electrician Babu', 'Plumber Ram', 'Cleaner Sunita']
  },

  // DEFAULT / FALLBACK
  default: {
    products: ['Standard Item A', 'Premium Item B', 'Accessory C', 'Bundle Offer D'],
    services: ['Basic Service', 'Premium Service', 'Consultation', 'Inspection'],
    staff: ['Agent 1', 'Agent 2', 'Specialist']
  }
};

const getMapping = (categoryStr) => {
  if (!categoryStr) return CATEGORY_MAPPINGS['default'];
  const slug = categoryStr.toLowerCase();
  
  for (const key of Object.keys(CATEGORY_MAPPINGS)) {
    if (slug.includes(key)) return CATEGORY_MAPPINGS[key];
  }
  
  // Sub-category routing logic
  if (slug.includes('health') || slug.includes('clinic')) return CATEGORY_MAPPINGS['doctor'];
  if (slug.includes('food') || slug.includes('pizza') || slug.includes('burger')) return CATEGORY_MAPPINGS['restaurant'];
  if (slug.includes('fashion') || slug.includes('clothing') || slug.includes('shoes')) return CATEGORY_MAPPINGS['retail'];
  if (slug.includes('auto') || slug.includes('car') || slug.includes('bike')) return CATEGORY_MAPPINGS['garage'];
  if (slug.includes('spa') || slug.includes('tattoo')) return CATEGORY_MAPPINGS['salon'];
  if (slug.includes('electrician') || slug.includes('plumber') || slug.includes('carpenter')) return CATEGORY_MAPPINGS['home_service'];

  return CATEGORY_MAPPINGS['default'];
};

const generateMockProducts = (categoryStr) => {
  const mapping = getMapping(categoryStr);
  return mapping.products.map((p, i) => ({
    id: generateId('prod'),
    name: p,
    description: `High quality ${p.toLowerCase()} for your daily needs.`,
    price: randPrice(100, 2500),
    image_url: 'https://placehold.co/400x400/png?text=Mock+Image',
    stock_quantity: randPrice(5, 50),
    unit: '1 Unit'
  }));
};

const generateMockServices = (categoryStr) => {
  const mapping = getMapping(categoryStr);
  return mapping.services.map((s, i) => ({
    id: generateId('srv'),
    name: s,
    description: `Professional ${s.toLowerCase()} provided by verified experts.`,
    duration_minutes: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
    price: randPrice(300, 5000),
    is_free_for_premium: Math.random() > 0.8 ? 1 : 0
  }));
};

const generateMockStaff = (categoryStr) => {
  const mapping = getMapping(categoryStr);
  return mapping.staff.map((s, i) => ({
    id: generateId('stf'),
    name: s.split(' (')[0],
    role: s.split(' (')[1] ? s.split(' (')[1].replace(')', '') : 'Staff',
    specialization: 'Expert',
    experience_years: randPrice(2, 15),
    avg_rating: (Math.random() * (5 - 4) + 4).toFixed(1),
    image_url: 'https://placehold.co/150x150/png?text=Staff'
  }));
};

module.exports = {
  generateMockProducts,
  generateMockServices,
  generateMockStaff
};
